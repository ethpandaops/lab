package xatu_cbt

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	MethodListFctAddressStorageSlotTop100ByContract = "ListFctAddressStorageSlotTop100ByContract"
)

// ListFctAddressStorageSlotTop100ByContract returns the top 100 contracts by total storage slots.
// This table contains contracts ranked by the total number of storage slots.
func (x *XatuCBT) ListFctAddressStorageSlotTop100ByContract(
	ctx context.Context,
	req *cbtproto.ListFctAddressStorageSlotTop100ByContractRequest,
) (resp *cbtproto.ListFctAddressStorageSlotTop100ByContractResponse, err error) {
	var (
		network string
		items   []*cbtproto.FctAddressStorageSlotTop100ByContract
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctAddressStorageSlotTop100ByContract, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctAddressStorageSlotTop100ByContract, network))
	defer timer.ObserveDuration()

	// Since this is a top 100 list, we'll typically want all records
	// If no filters are provided, get all 100 records ordered by rank

	// Create a copy of the request to avoid mutating the original
	reqCopy := &cbtproto.ListFctAddressStorageSlotTop100ByContractRequest{
		Rank:              req.Rank,
		ContractAddress:   req.ContractAddress,
		TotalStorageSlots: req.TotalStorageSlots,
		PageSize:          req.PageSize,
		PageToken:         req.PageToken,
		OrderBy:           req.OrderBy,
	}

	// Set default rank filter if not provided (required as primary key)
	if reqCopy.Rank == nil {
		// Get all ranks from 1 to 100
		reqCopy.Rank = &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Lte{Lte: 100},
		}
	}

	if reqCopy.PageSize == 0 {
		reqCopy.PageSize = 100 // Default to getting all top 100
	}

	if reqCopy.OrderBy == "" {
		reqCopy.OrderBy = "rank asc" // Default ordering by rank
	}

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctAddressStorageSlotTop100ByContractQuery(
		reqCopy,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	// Execute the query with scanner pattern.
	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		item, scanErr := scanFctAddressStorageSlotTop100ByContract(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctAddressStorageSlotTop100ByContract: Failed to scan row")

			return nil
		}

		items = append(items, item)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_address_storage_slot_top_100_by_contract: %w", err)
	}

	// Calculate pagination.
	pageSize := reqCopy.PageSize
	if pageSize == 0 {
		pageSize = 100
	}

	// Get current offset from token.
	currentOffset, err := cbtproto.DecodePageToken(reqCopy.PageToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decode page token: %w", err)
	}

	//nolint:gosec // conversion safe.
	// Return vendored types directly (NO transformation)
	return &cbtproto.ListFctAddressStorageSlotTop100ByContractResponse{
		FctAddressStorageSlotTop_100ByContract: items,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(items)),
		),
	}, nil
}

// scanFctAddressStorageSlotTop100ByContract scans a single fct_address_storage_slot_top_100_by_contract row from the database.
func scanFctAddressStorageSlotTop100ByContract(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctAddressStorageSlotTop100ByContract, error) {
	item := &cbtproto.FctAddressStorageSlotTop100ByContract{}

	if err := scanner.Scan(
		&item.UpdatedDateTime,
		&item.Rank,
		&item.ContractAddress,
		&item.TotalStorageSlots,
	); err != nil {
		return nil, fmt.Errorf("failed to scan fct_address_storage_slot_top_100_by_contract: %w", err)
	}

	return item, nil
}
