package state_analytics

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// GetLatestBlockDelta returns state changes for the most recent block
func (s *Service) GetLatestBlockDelta(
	ctx context.Context,
	req *pb.GetLatestBlockDeltaRequest,
) (*pb.GetLatestBlockDeltaResponse, error) {
	startTime := time.Now()
	method := "GetLatestBlockDelta"

	// Get network from context
	network, err := s.getNetworkFromContext(ctx)
	if err != nil {
		s.recordMetrics(method, "unknown", StatusError, time.Since(startTime).Seconds())
		return nil, err
	}

	s.log.WithField("network", network).Debug("Fetching latest block delta")

	// Get ClickHouse client
	client, err := s.getClient(network)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("failed to get ClickHouse client: %w", err)
	}

	// Query for latest block delta
	query := strings.ReplaceAll(queryLatestBlockDelta, "{database}", network)

	rows, err := client.Query(ctx, query)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("failed to query latest block delta: %w", err)
	}

	if len(rows) == 0 {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("no data returned for latest block")
	}

	// Parse first row
	row := rows[0]
	blockNumber := getUint64(row, "block_number")
	newSlots := getUint32(row, "new_slots")
	clearedSlots := getUint32(row, "cleared_slots")
	modifiedSlots := getUint32(row, "modified_slots")

	// Calculate estimated bytes
	estimatedBytesAdded := uint64(newSlots) * BytesPerSlot
	// Cast to int64 BEFORE subtraction to avoid unsigned underflow
	netStateChangeBytes := (int64(newSlots) - int64(clearedSlots)) * BytesPerSlot

	// Get top contributors for this block
	topContributors, err := s.getTopContributorsForBlock(ctx, client, network, blockNumber)
	if err != nil {
		s.log.WithError(err).Warn("Failed to get top contributors, continuing without them")
		topContributors = []*pb.ContractStateDelta{}
	}

	// Estimate block timestamp (12s per block, assuming genesis at ~1606824000 for mainnet)
	// This is a rough estimate - in production you'd query the actual timestamp
	genesisTime := int64(1606824000)
	blockTimestamp := time.Unix(genesisTime+int64(blockNumber)*12, 0)

	s.recordMetrics(method, network, StatusSuccess, time.Since(startTime).Seconds())

	return &pb.GetLatestBlockDeltaResponse{
		BlockNumber:          blockNumber,
		BlockTimestamp:       timestamppb.New(blockTimestamp),
		NewSlotsCount:        newSlots,
		ModifiedSlotsCount:   modifiedSlots,
		ClearedSlotsCount:    clearedSlots,
		EstimatedBytesAdded:  estimatedBytesAdded,
		NetStateChangeBytes:  netStateChangeBytes,
		TopContributors:      topContributors,
	}, nil
}

// getTopContributorsForBlock gets the top state change contributors for a specific block
func (s *Service) getTopContributorsForBlock(
	ctx context.Context,
	client clickhouse.Client,
	network string,
	blockNumber uint64,
) ([]*pb.ContractStateDelta, error) {
	query := strings.ReplaceAll(queryLatestBlockTopContributors, "{database}", network)
	query = strings.ReplaceAll(query, "{bytes_per_slot}", fmt.Sprintf("%d", BytesPerSlot))

	rows, err := client.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query top contributors: %w", err)
	}

	var contributors []*pb.ContractStateDelta

	for _, row := range rows {
		address := getString(row, "address")
		newSlots := getUint32(row, "new_slots")
		modifiedSlots := getUint32(row, "modified_slots")
		clearedSlots := getUint32(row, "cleared_slots")
		netBytes := getInt64(row, "net_bytes")

		contributors = append(contributors, &pb.ContractStateDelta{
			Address:       address,
			NewSlots:      newSlots,
			ModifiedSlots: modifiedSlots,
			ClearedSlots:  clearedSlots,
			NetBytes:      netBytes,
			Label:         "", // Will be populated later by labeling service
		})
	}

	return contributors, nil
}

// Helper functions to extract typed values from ClickHouse result maps
func getString(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

func getUint32(m map[string]interface{}, key string) uint32 {
	if v, ok := m[key]; ok {
		switch val := v.(type) {
		case uint32:
			return val
		case uint64:
			return uint32(val)
		case int:
			return uint32(val)
		case int64:
			return uint32(val)
		case float64:
			return uint32(val)
		}
	}
	return 0
}

func getUint64(m map[string]interface{}, key string) uint64 {
	if v, ok := m[key]; ok {
		switch val := v.(type) {
		case uint64:
			return val
		case uint32:
			return uint64(val)
		case int:
			return uint64(val)
		case int64:
			return uint64(val)
		case float64:
			return uint64(val)
		}
	}
	return 0
}

func getInt64(m map[string]interface{}, key string) int64 {
	if v, ok := m[key]; ok {
		switch val := v.(type) {
		case int64:
			return val
		case int:
			return int64(val)
		case uint64:
			return int64(val)
		case uint32:
			return int64(val)
		case float64:
			return int64(val)
		}
	}
	return 0
}

func getFloat64(m map[string]interface{}, key string) float64 {
	if v, ok := m[key]; ok {
		switch val := v.(type) {
		case float64:
			return val
		case float32:
			return float64(val)
		case int:
			return float64(val)
		case int64:
			return float64(val)
		case uint64:
			return float64(val)
		case uint32:
			return float64(val)
		}
	}
	return 0.0
}
