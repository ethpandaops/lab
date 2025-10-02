package xatu_cbt

import (
	"context"
	"fmt"
	"strings"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	MethodGetDataAvailability = "GetDataAvailability"
)

// GetDataAvailability returns the common availability interval across a set of transformation tables.
func (x *XatuCBT) GetDataAvailability(
	ctx context.Context,
	req *pb.GetDataAvailabilityRequest,
) (resp *pb.GetDataAvailabilityResponse, err error) {
	var network string

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		if x.requestsTotal != nil {
			x.requestsTotal.WithLabelValues(MethodGetDataAvailability, network, status).Inc()
		}
	}()

	// Get network and clickhouse client
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get network client: %w", err)
	}

	network = client.Network()

	// Start metrics timer
	var timer *prometheus.Timer
	if x.requestDuration != nil {
		timer = prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodGetDataAvailability, network))
		defer timer.ObserveDuration()
	}

	// Validate tables
	if len(req.Tables) == 0 {
		return nil, fmt.Errorf("no tables specified")
	}

	// Get genesis time for the network
	genesisTime, err := x.getNetworkGenesisTime(ctx, network)
	if err != nil {
		return nil, fmt.Errorf("failed to get genesis time: %w", err)
	}

	// Build the SQL query with slot calculation
	secondsPerSlot := int64(12) // Hardcoded for now, can be made configurable later
	query := x.buildDataAvailabilityQuery(network, req.Tables, genesisTime, secondsPerSlot)

	// Execute query
	row, err := client.QueryRow(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query data availability: %w", err)
	}

	// Parse results
	minSlotInterface, hasMinSlot := row["min_slot"]
	maxSlotInterface, hasMaxSlot := row["max_slot"]

	if !hasMinSlot || !hasMaxSlot {
		// No overlapping data - return empty response
		return &pb.GetDataAvailabilityResponse{}, nil
	}

	// Convert to uint64
	var minSlot, maxSlot uint64

	switch v := minSlotInterface.(type) {
	case uint64:
		minSlot = v
	case int64:
		if v < 0 {
			return nil, fmt.Errorf("negative min_slot: %d", v)
		}

		minSlot = uint64(v)
	case uint32:
		minSlot = uint64(v)
	case int32:
		if v < 0 {
			return nil, fmt.Errorf("negative min_slot: %d", v)
		}

		minSlot = uint64(v)
	default:
		return nil, fmt.Errorf("unexpected type for min_slot: %T", v)
	}

	switch v := maxSlotInterface.(type) {
	case uint64:
		maxSlot = v
	case int64:
		if v < 0 {
			return nil, fmt.Errorf("negative max_slot: %d", v)
		}

		maxSlot = uint64(v)
	case uint32:
		maxSlot = uint64(v)
	case int32:
		if v < 0 {
			return nil, fmt.Errorf("negative max_slot: %d", v)
		}

		maxSlot = uint64(v)
	default:
		return nil, fmt.Errorf("unexpected type for max_slot: %T", v)
	}

	return &pb.GetDataAvailabilityResponse{
		MinSlot: minSlot,
		MaxSlot: maxSlot,
	}, nil
}

// buildDataAvailabilityQuery builds the SQL query for checking data availability.
func (x *XatuCBT) buildDataAvailabilityQuery(network string, tables []string, genesisTime int64, secondsPerSlot int64) string {
	// Build the table list for the IN clause
	tableList := make([]string, len(tables))
	for i, table := range tables {
		// Add network prefix and quote
		tableList[i] = fmt.Sprintf("('%s', '%s')", network, table)
	}

	// admin_cbt table always uses "position" and "interval" columns
	positionColumn := "position"
	intervalColumn := "interval"

	// Build query that calculates slots directly
	query := fmt.Sprintf(`
WITH
    %d AS genesis_time,
    %d AS seconds_per_slot
SELECT
    intDiv(max(min_position) - genesis_time, seconds_per_slot) AS min_slot,
    intDiv(min(max_position_end) - genesis_time, seconds_per_slot) AS max_slot
FROM (
    SELECT
        database,
        table,
        min(%s) AS min_position,
        max(%s) + argMax(%s, %s) AS max_position_end
    FROM %s.admin_cbt FINAL
    WHERE (database, table) IN (%s)
    GROUP BY database, table
)`,
		genesisTime,
		secondsPerSlot,
		positionColumn,
		positionColumn, intervalColumn, positionColumn,
		network,
		strings.Join(tableList, ", "),
	)

	x.log.WithField("query", query).Debug("Built data availability query")

	return query
}

// getNetworkGenesisTime retrieves the genesis time for a network.
// It first checks for an override in xatu_cbt config, then falls back to cartographoor.
func (x *XatuCBT) getNetworkGenesisTime(ctx context.Context, networkName string) (int64, error) {
	// First check for config override
	if genesisTimePtr := x.GetNetworkGenesisTime(networkName); genesisTimePtr != nil {
		return *genesisTimePtr, nil
	}

	// Fall back to cartographoor
	if x.cartographoorService == nil {
		return 0, fmt.Errorf("cartographoor service not available")
	}

	network := x.cartographoorService.GetNetwork(networkName)
	if network == nil {
		return 0, fmt.Errorf("network %s not found", networkName)
	}

	if network.GenesisConfig == nil {
		return 0, fmt.Errorf("genesis config not available for network %s", networkName)
	}

	return network.GenesisConfig.GenesisTime, nil
}

// GetDataAvailabilityForSlot is a helper method to check if a specific slot has data available.
func (x *XatuCBT) GetDataAvailabilityForSlot(
	ctx context.Context,
	networkName string,
	slot phase0.Slot,
	tables []string,
) (bool, error) {
	// Add network to context metadata
	ctx = x.addNetworkToContext(ctx, networkName)

	// Create request
	req := &pb.GetDataAvailabilityRequest{
		Tables: tables,
	}

	// Get availability
	resp, err := x.GetDataAvailability(ctx, req)
	if err != nil {
		return false, fmt.Errorf("failed to get data availability: %w", err)
	}

	// No data if both slots are 0
	if resp.MinSlot == 0 && resp.MaxSlot == 0 {
		return false, nil
	}

	// Check if slot is within range
	slotNum := uint64(slot)

	return slotNum >= resp.MinSlot && slotNum <= resp.MaxSlot, nil
}

// addNetworkToContext is a helper to add network metadata to context.
func (x *XatuCBT) addNetworkToContext(ctx context.Context, network string) context.Context {
	// This would normally be done by the gRPC interceptor, but for internal calls
	// we need to add it manually
	// Note: This is a simplified version - in production you'd use metadata.NewOutgoingContext
	return ctx
}
