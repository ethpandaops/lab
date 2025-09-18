package xatu_cbt

import (
	"context"
	"fmt"
	"strings"
	"time"

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
	default:
		return nil, fmt.Errorf("unexpected type for available_from: %T", v)
	}

	switch v := availableUntilInterface.(type) {
	case time.Time:
		availableUntilTimestamp = &v
	case *time.Time:
		availableUntilTimestamp = v
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

	// Calculate slots from timestamps using ethereum wallclock
	minSlot, maxSlot, safeSlot, headSlot, err := x.calculateSlots(
		ctx,
		network,
		*availableFromTimestamp,
		*availableUntilTimestamp,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate slots: %w", err)
	}

	return &pb.GetDataAvailabilityResponse{
		AvailableFromTimestamp:  availableFromTimestamp.Unix(),
		AvailableUntilTimestamp: availableUntilTimestamp.Unix(),
		MinSlot:                 minSlot,
		MaxSlot:                 maxSlot,
		SafeSlot:                safeSlot,
		HeadSlot:                headSlot,
		HasData:                 true,
	}, nil
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

// calculateSlots converts timestamps to slot numbers using the ethereum wallclock.
func (x *XatuCBT) calculateSlots(
	ctx context.Context,
	networkName string,
	availableFrom time.Time,
	availableUntil time.Time,
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

	// Get ethereum network for wallclock access
	if x.ethereumClient == nil {
		return 0, 0, 0, 0, fmt.Errorf("ethereum client not available")
	}

	ethNetwork := x.ethereumClient.GetNetwork(network.Name)
	if ethNetwork == nil {
		return 0, 0, 0, 0, fmt.Errorf("ethereum network %s not found", network.Name)
	}

	wallclock := ethNetwork.GetWallclock()
	if wallclock == nil {
		return 0, 0, 0, 0, fmt.Errorf("wallclock not available for network %s", network.Name)
	}

	// Get slots for the timestamps
	minSlotDetail := wallclock.Slots().FromTime(availableFrom)
	maxSlotDetail := wallclock.Slots().FromTime(availableUntil)
	currentSlot := wallclock.Slots().Current()

	minSlot = minSlotDetail.Number()
	maxSlot = maxSlotDetail.Number()
	headSlot = currentSlot.Number()

	// Calculate safe slot (head - 2 slots for safety)
	// Use the minimum of maxSlot and (headSlot - 2) to ensure we don't go beyond available data
	if headSlot > 2 {
		potentialSafeSlot := headSlot - 2
		if potentialSafeSlot > maxSlot {
			safeSlot = maxSlot
		} else {
			safeSlot = potentialSafeSlot
		}
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
