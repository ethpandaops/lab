package xatu_cbt

import (
	"context"
	"fmt"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	MethodListFctAddressStorageSlotExpiredTop100ByContract = "ListFctAddressStorageSlotExpiredTop100ByContract"
)

// ListFctAddressStorageSlotExpiredTop100ByContract returns the top 100 contracts by expired storage slots.
// This table contains contracts ranked by the number of storage slots that haven't been accessed in the last 365 days.
func (x *XatuCBT) ListFctAddressStorageSlotExpiredTop100ByContract(
	ctx context.Context,
	req *cbtproto.ListFctAddressStorageSlotExpiredTop100ByContractRequest,
) (resp *cbtproto.ListFctAddressStorageSlotExpiredTop100ByContractResponse, err error) {
	var (
		network string
		items   []*cbtproto.FctAddressStorageSlotExpiredTop100ByContract
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctAddressStorageSlotExpiredTop100ByContract, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctAddressStorageSlotExpiredTop100ByContract, network))
	defer timer.ObserveDuration()

	// Since this is a top 100 list, we'll typically want all records
	// If no filters are provided, get all 100 records ordered by rank

	// Set default rank filter if not provided (required as primary key)
	if req.Rank == nil {
		// Get all ranks from 1 to 100
		req.Rank = &cbtproto.UInt32Filter{
			Filter: &cbtproto.UInt32Filter_Lte{Lte: 100},
		}
	}

	if req.PageSize == 0 {
		req.PageSize = 100 // Default to getting all top 100
	}

	if req.OrderBy == "" {
		req.OrderBy = "rank asc" // Default ordering by rank
	}

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctAddressStorageSlotExpiredTop100ByContractQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	// Execute the query with scanner pattern.
	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		item, scanErr := scanFctAddressStorageSlotExpiredTop100ByContract(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctAddressStorageSlotExpiredTop100ByContract: Failed to scan row")

			return nil
		}

		items = append(items, item)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_address_storage_slot_expired_top_100_by_contract: %w", err)
	}

	// Calculate pagination.
	pageSize := req.PageSize
	if pageSize == 0 {
		pageSize = 100
	}

	// Get current offset from token.
	currentOffset, err := cbtproto.DecodePageToken(req.PageToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decode page token: %w", err)
	}

	//nolint:gosec // conversion safe.
	// Return vendored types directly (NO transformation)
	return &cbtproto.ListFctAddressStorageSlotExpiredTop100ByContractResponse{
		FctAddressStorageSlotExpiredTop_100ByContract: items,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(items)),
		),
	}, nil
}

// scanFctAddressStorageSlotExpiredTop100ByContract scans a single fct_address_storage_slot_expired_top_100_by_contract row from the database.
func scanFctAddressStorageSlotExpiredTop100ByContract(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctAddressStorageSlotExpiredTop100ByContract, error) {
	item := &cbtproto.FctAddressStorageSlotExpiredTop100ByContract{}

	var (
		updatedDateTime time.Time
		rank            uint32
		contractAddress string
		expiredSlots    uint64
	)

	if err := scanner.Scan(
		&updatedDateTime,
		&rank,
		&contractAddress,
		&expiredSlots,
	); err != nil {
		return nil, fmt.Errorf("failed to scan fct_address_storage_slot_expired_top_100_by_contract: %w", err)
	}

	// Convert time to uint32 Unix timestamp
	item.UpdatedDateTime = uint32(updatedDateTime.Unix()) //nolint:gosec // conversion safe for timestamps
	item.Rank = rank
	item.ContractAddress = contractAddress
	item.ExpiredSlots = expiredSlots

	return item, nil
}
