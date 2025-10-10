package xatu_cbt

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	MethodListFctAddressAccessTotal = "ListFctAddressAccessTotal"
	MethodGetFctAddressAccessTotal  = "GetFctAddressAccessTotal"
)

// GetFctAddressAccessTotal returns the latest address access totals from the fct_address_access_total table.
// Since this table contains aggregated statistics, we'll fetch the most recent record.
func (x *XatuCBT) GetFctAddressAccessTotal(
	ctx context.Context,
	req *cbtproto.GetFctAddressAccessTotalRequest,
) (resp *cbtproto.GetFctAddressAccessTotalResponse, err error) {
	var (
		network string
		item    *cbtproto.FctAddressAccessTotal
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodGetFctAddressAccessTotal, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodGetFctAddressAccessTotal, network))
	defer timer.ObserveDuration()

	// Build a simple query to get the specific record by primary key (updated_date_time).
	// If no specific timestamp is provided, get the most recent one.
	var query string

	var args []any

	if req.UpdatedDateTime != 0 {
		// Get specific record by primary key
		query = fmt.Sprintf(`
			SELECT
				toUnixTimestamp(updated_date_time) AS updated_date_time,
				total_accounts,
				expired_accounts,
				total_contract_accounts,
				expired_contracts
			FROM %s.fct_address_access_total FINAL
			WHERE updated_date_time = ?
			LIMIT 1
		`, network)
		args = []any{req.UpdatedDateTime}
	} else {
		// Get the most recent record
		query = fmt.Sprintf(`
			SELECT
				toUnixTimestamp(updated_date_time) AS updated_date_time,
				total_accounts,
				expired_accounts,
				total_contract_accounts,
				expired_contracts
			FROM %s.fct_address_access_total FINAL
			ORDER BY updated_date_time DESC
			LIMIT 1
		`, network)
	}

	// Execute the query with scanner pattern.
	found := false

	if err = client.QueryWithScanner(ctx, query, func(scanner clickhouse.RowScanner) error {
		var scanErr error
		item, scanErr = scanFctAddressAccessTotal(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctAddressAccessTotal: Failed to scan row")

			return scanErr
		}
		found = true

		return nil
	}, args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_address_access_total: %w", err)
	}

	if !found {
		return nil, fmt.Errorf("no address access total record found")
	}

	return &cbtproto.GetFctAddressAccessTotalResponse{
		Item: item,
	}, nil
}

// ListFctAddressAccessTotal returns address access totals from the fct_address_access_total table.
func (x *XatuCBT) ListFctAddressAccessTotal(
	ctx context.Context,
	req *cbtproto.ListFctAddressAccessTotalRequest,
) (resp *cbtproto.ListFctAddressAccessTotalResponse, err error) {
	var (
		network string
		items   []*cbtproto.FctAddressAccessTotal
	)

	defer func() {
		status := StatusSuccess
		if err != nil {
			status = StatusError
		}

		x.requestsTotal.WithLabelValues(MethodListFctAddressAccessTotal, network, status).Inc()
	}()

	// Get network and clickhouse client.
	client, err := x.getNetworkClient(ctx)
	if err != nil {
		return nil, err
	}

	network = client.Network()

	timer := prometheus.NewTimer(x.requestDuration.WithLabelValues(MethodListFctAddressAccessTotal, network))
	defer timer.ObserveDuration()

	// Use our clickhouse-proto-gen to handle building for us.
	sqlQuery, err := cbtproto.BuildListFctAddressAccessTotalQuery(
		req,
		cbtproto.WithFinal(),
		cbtproto.WithDatabase(network),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to build query: %w", err)
	}

	// Execute the query with scanner pattern.
	if err = client.QueryWithScanner(ctx, sqlQuery.Query, func(scanner clickhouse.RowScanner) error {
		item, scanErr := scanFctAddressAccessTotal(scanner)
		if scanErr != nil {
			x.log.WithError(scanErr).Error("scanFctAddressAccessTotal: Failed to scan row")

			return nil
		}

		items = append(items, item)

		return nil
	}, sqlQuery.Args...); err != nil {
		return nil, fmt.Errorf("failed to query fct_address_access_total: %w", err)
	}

	// Calculate pagination.
	pageSize := req.PageSize
	if pageSize == 0 {
		pageSize = DefaultPageSize
	}

	// Get current offset from token.
	currentOffset, err := cbtproto.DecodePageToken(req.PageToken)
	if err != nil {
		return nil, fmt.Errorf("failed to decode page token: %w", err)
	}

	//nolint:gosec // conversion safe.
	// Return vendored types directly (NO transformation)
	return &cbtproto.ListFctAddressAccessTotalResponse{
		FctAddressAccessTotal: items,
		NextPageToken: cbtproto.CalculateNextPageToken(
			currentOffset,
			uint32(pageSize),
			uint32(len(items)),
		),
	}, nil
}

// scanFctAddressAccessTotal scans a single fct_address_access_total row from the database.
func scanFctAddressAccessTotal(
	scanner clickhouse.RowScanner,
) (*cbtproto.FctAddressAccessTotal, error) {
	item := &cbtproto.FctAddressAccessTotal{}

	if err := scanner.Scan(
		&item.UpdatedDateTime,
		&item.TotalAccounts,
		&item.ExpiredAccounts,
		&item.TotalContractAccounts,
		&item.ExpiredContracts,
	); err != nil {
		return nil, fmt.Errorf("failed to scan fct_address_access_total: %w", err)
	}

	return item, nil
}
