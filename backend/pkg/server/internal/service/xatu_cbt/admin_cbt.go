package xatu_cbt

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	"github.com/prometheus/client_golang/prometheus"
	"google.golang.org/grpc/metadata"
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

	// Extract head_delay_slots from metadata
	var headDelaySlots uint32 = 2 // default value

	if md, ok := metadata.FromIncomingContext(ctx); ok {
		if delaySlots := md.Get("head_delay_slots"); len(delaySlots) > 0 {
			if parsed, err := strconv.ParseUint(delaySlots[0], 10, 32); err == nil {
				headDelaySlots = uint32(parsed)
			}
		}
	}

	// Start metrics timer
	var timer *prometheus.Timer
	if x.requestDuration != nil {
		timer = prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodGetDataAvailability, network))
		defer timer.ObserveDuration()
	}

	// Default position field if not specified
	positionField := req.PositionField
	if positionField == "" {
		positionField = "slot_start_date_time"
	}

	// Validate tables
	if len(req.Tables) == 0 {
		return nil, fmt.Errorf("no tables specified")
	}

	// Build the SQL query
	query := x.buildDataAvailabilityQuery(network, req.Tables, positionField)

	// Execute query
	row, err := client.QueryRow(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query data availability: %w", err)
	}

	// Parse results
	var availableFromTimestamp, availableUntilTimestamp *time.Time

	availableFromInterface, hasFrom := row["available_from"]
	availableUntilInterface, hasUntil := row["available_until"]

	if !hasFrom || !hasUntil {
		// No overlapping data
		return &pb.GetDataAvailabilityResponse{
			HasData: false,
		}, nil
	}

	// Convert to time.Time
	switch v := availableFromInterface.(type) {
	case time.Time:
		availableFromTimestamp = &v
	case *time.Time:
		availableFromTimestamp = v
	case nil:
		return &pb.GetDataAvailabilityResponse{
			HasData: false,
		}, nil
	default:
		return nil, fmt.Errorf("unexpected type for available_from: %T", v)
	}

	switch v := availableUntilInterface.(type) {
	case time.Time:
		availableUntilTimestamp = &v
	case *time.Time:
		availableUntilTimestamp = v
	case nil:
		return &pb.GetDataAvailabilityResponse{
			HasData: false,
		}, nil
	default:
		return nil, fmt.Errorf("unexpected type for available_until: %T", v)
	}

	// Check if we actually have data
	if availableFromTimestamp == nil || availableUntilTimestamp == nil ||
		availableFromTimestamp.IsZero() || availableUntilTimestamp.IsZero() {
		return &pb.GetDataAvailabilityResponse{
			HasData: false,
		}, nil
	}

	// Check if timestamps are Unix epoch (1970-01-01), which means no real data
	// This happens when the database has no data and returns default values
	if availableFromTimestamp.Unix() == 0 || availableUntilTimestamp.Unix() == 0 {
		// When no data is available, don't return slot information as it's misleading
		// There's no "safe" slot if no data exists to query
		return &pb.GetDataAvailabilityResponse{
			AvailableFromTimestamp:  0, // Explicitly set to 0
			AvailableUntilTimestamp: 0, // Explicitly set to 0
			MinSlot:                 0, // No data, so no min slot
			MaxSlot:                 0, // No data, so no max slot
			SafeSlot:                0, // No safe slot when no data available
			HeadSlot:                0, // No meaningful head slot for data queries
			HasData:                 false,
		}, nil
	}

	// Calculate slots from timestamps using ethereum wallclock
	minSlot, maxSlot, safeSlot, headSlot, err := x.calculateSlotsWithDelay(
		ctx,
		network,
		*availableFromTimestamp,
		*availableUntilTimestamp,
		headDelaySlots,
	)
	if err != nil {
		// If we get an error about Unix epoch timestamps, return no data
		if strings.Contains(err.Error(), "Unix epoch") {
			x.log.WithField("error", err).Debug("Unix epoch timestamps detected, no data available")

			return &pb.GetDataAvailabilityResponse{
				HasData: false,
			}, nil
		}
		return nil, fmt.Errorf("failed to calculate slots: %w", err)
	}

	response := &pb.GetDataAvailabilityResponse{
		AvailableFromTimestamp:  availableFromTimestamp.Unix(),
		AvailableUntilTimestamp: availableUntilTimestamp.Unix(),
		MinSlot:                 minSlot,
		MaxSlot:                 maxSlot,
		SafeSlot:                safeSlot,
		HeadSlot:                headSlot,
		HasData:                 true,
	}

	return response, nil
}

// buildDataAvailabilityQuery builds the SQL query for checking data availability.
func (x *XatuCBT) buildDataAvailabilityQuery(network string, tables []string, positionField string) string {
	// Build the table list for the IN clause
	tableList := make([]string, len(tables))
	for i, table := range tables {
		// Add network prefix and quote
		tableList[i] = fmt.Sprintf("('%s', '%s')", network, table)
	}

	// Use position as the field name, but handle special cases
	positionColumn := "position"
	intervalColumn := "interval"

	// If positionField is "slot_start_date_time", we're dealing with time-based positions
	// These are Unix timestamps, so we can directly use them
	query := fmt.Sprintf(`
WITH table_ranges AS (
    SELECT
        database,
        table,
        min(%s) AS min_pos,
        max(%s) + argMax(%s, %s) AS max_pos_end
    FROM %s.admin_cbt FINAL
    WHERE (database, table) IN (%s)
    GROUP BY database, table
)
SELECT
    fromUnixTimestamp(max(min_pos)) AS available_from,
    fromUnixTimestamp(min(max_pos_end)) AS available_until
FROM table_ranges`,
		positionColumn,
		positionColumn, intervalColumn, positionColumn,
		network,
		strings.Join(tableList, ", "),
	)

	x.log.WithField("query", query).Debug("Built data availability query")

	return query
}

// calculateSlotsWithDelay converts timestamps to slot numbers using the ethereum wallclock.
func (x *XatuCBT) calculateSlotsWithDelay(
	ctx context.Context,
	networkName string,
	availableFrom time.Time,
	availableUntil time.Time,
	headDelaySlots uint32,
) (minSlot, maxSlot, safeSlot, headSlot uint64, err error) {
	// Get the ethereum network from cartographoor service
	if x.cartographoorService == nil {
		return 0, 0, 0, 0, fmt.Errorf("cartographoor service not available")
	}

	// Validate network
	network, err := x.cartographoorService.ValidateNetwork(ctx, networkName)
	if err != nil {
		return 0, 0, 0, 0, fmt.Errorf("failed to validate network: %w", err)
	}

	// Get wallclock for the network
	if x.wallclockService == nil {
		return 0, 0, 0, 0, fmt.Errorf("wallclock service not available")
	}

	wallclock := x.wallclockService.GetWallclock(network.Name)
	if wallclock == nil {
		return 0, 0, 0, 0, fmt.Errorf("wallclock not available for network %s", network.Name)
	}

	// Double-check we don't have Unix epoch timestamps (should be caught earlier)
	if availableFrom.Unix() == 0 || availableUntil.Unix() == 0 {
		return 0, 0, 0, 0, fmt.Errorf("cannot calculate slots from Unix epoch timestamps")
	}

	// Get slots for the timestamps
	minSlotDetail := wallclock.Slots().FromTime(availableFrom)
	maxSlotDetail := wallclock.Slots().FromTime(availableUntil)
	currentSlot := wallclock.Slots().Current()

	minSlot = minSlotDetail.Number()
	maxSlot = maxSlotDetail.Number()
	headSlot = currentSlot.Number()

	// Calculate safe slot (max - delay slots for safety)
	// This ensures we only show slots we definitely have data for
	if maxSlot > uint64(headDelaySlots) {
		safeSlot = maxSlot - uint64(headDelaySlots)
	} else {
		safeSlot = 0
	}

	x.log.WithField("network", networkName).
		WithField("min_slot", minSlot).
		WithField("max_slot", maxSlot).
		WithField("safe_slot", safeSlot).
		WithField("head_slot", headSlot).
		Debug("Calculated slots from timestamps")

	return minSlot, maxSlot, safeSlot, headSlot, nil
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
		Tables:        tables,
		PositionField: "slot_start_date_time",
	}

	// Get availability
	resp, err := x.GetDataAvailability(ctx, req)
	if err != nil {
		return false, fmt.Errorf("failed to get data availability: %w", err)
	}

	if !resp.HasData {
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
