package state_analytics

import (
	"context"
	"fmt"
	"strings"
	"time"

	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/state_analytics"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// GetContractStateComposition returns current state size for all contracts
func (s *Service) GetContractStateComposition(
	ctx context.Context,
	req *pb.GetContractStateCompositionRequest,
) (*pb.GetContractStateCompositionResponse, error) {
	startTime := time.Now()
	method := "GetContractStateComposition"

	// Get network from context
	network, err := s.getNetworkFromContext(ctx)
	if err != nil {
		s.recordMetrics(method, "unknown", StatusError, time.Since(startTime).Seconds())
		return nil, err
	}

	s.log.WithField("network", network).Debug("Fetching contract state composition")

	// Get ClickHouse client
	client, err := s.getClient(network)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("failed to get ClickHouse client: %w", err)
	}

	// Set defaults
	limit := req.Limit
	if limit == 0 {
		limit = 10000
	}
	if limit > 50000 {
		limit = 50000 // Cap at 50k contracts
	}

	minSizeBytes := req.MinSizeBytes
	if minSizeBytes == 0 {
		minSizeBytes = 0 // Include all contracts by default
	}

	// Build query with replacements
	query := strings.ReplaceAll(queryContractStateComposition, "{database}", network)
	query = strings.ReplaceAll(query, "{bytes_per_slot}", fmt.Sprintf("%d", BytesPerSlot))
	query = strings.ReplaceAll(query, "{min_size_bytes}", fmt.Sprintf("%d", minSizeBytes))
	query = strings.ReplaceAll(query, "{limit}", fmt.Sprintf("%d", limit))

	// Execute query
	rows, err := client.Query(ctx, query)
	if err != nil {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("failed to query contract state composition: %w", err)
	}

	if len(rows) == 0 {
		s.recordMetrics(method, network, StatusError, time.Since(startTime).Seconds())
		return nil, fmt.Errorf("no contract data returned")
	}

	// Parse results
	contracts := make([]*pb.ContractStateEntry, 0, len(rows))
	var totalStateBytes uint64
	var blockNumber uint64

	for _, row := range rows {
		address := getString(row, "address")
		storageSlotCount := getUint64(row, "storage_slot_count")
		totalBytes := getUint64(row, "total_bytes")
		firstSeenBlock := getUint64(row, "first_seen_block")
		lastActiveBlock := getUint64(row, "last_active_block")
		percentageOfTotal := getFloat64(row, "percentage_of_total")

		// Track latest block number
		if lastActiveBlock > blockNumber {
			blockNumber = lastActiveBlock
		}

		totalStateBytes += totalBytes

		// Create contract entry (without labels for now)
		contracts = append(contracts, &pb.ContractStateEntry{
			Address: address,
			Label:   "", // Will be filled by labeling service later
			Category: "", // Will be filled by labeling service later
			Protocol: "", // Will be filled by labeling service later
			State: &pb.ContractState{
				StorageSlotCount: storageSlotCount,
				TotalBytes:       totalBytes,
				BytecodeBytes:    0, // Not calculated yet
				FirstSeenBlock:   firstSeenBlock,
				LastActiveBlock:  lastActiveBlock,
			},
			PercentageOfTotal: percentageOfTotal,
		})
	}

	// Estimate block timestamp (12s per block, assuming genesis at ~1606824000 for mainnet)
	genesisTime := int64(1606824000)
	blockTimestamp := time.Unix(genesisTime+int64(blockNumber)*12, 0)

	s.recordMetrics(method, network, StatusSuccess, time.Since(startTime).Seconds())

	return &pb.GetContractStateCompositionResponse{
		Contracts:       contracts,
		BlockNumber:     blockNumber,
		Timestamp:       timestamppb.New(blockTimestamp),
		TotalStateBytes: totalStateBytes,
	}, nil
}
