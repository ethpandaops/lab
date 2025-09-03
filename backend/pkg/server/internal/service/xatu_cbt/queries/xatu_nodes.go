package queries

import (
	"context"
	"fmt"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
)

const (
	// TableIntXatuNodes24h is the CBT table for xatu nodes aggregated over 24h.
	TableIntXatuNodes24h = "int_xatu_nodes__24h"

	// Future cbt tables?
	// TableIntXatuNodes1h  = "int_xatu_nodes__1h"
	// TableIntXatuNodes7d  = "int_xatu_nodes__7d"
	// TableDimXatuNodes    = "dim_xatu_nodes"
)

// GetXatuNodeQueries returns all xatu node queries indexed by table name.
func GetXatuNodeQueries() map[string]string {
	return map[string]string{
		TableIntXatuNodes24h: `
			SELECT
				username,
				node_id,
				classification,
				meta_client_name,
				meta_client_version,
				meta_client_implementation,
				meta_client_geo_city,
				meta_client_geo_country,
				meta_client_geo_country_code,
				meta_client_geo_continent_code,
				meta_consensus_version,
				meta_consensus_implementation,
				last_seen_date_time
			FROM %s.` + TableIntXatuNodes24h + `
			ORDER BY last_seen_date_time DESC`,
	}
}

// ScanXatuNodes scans multiple xatu node rows from the database.
func ScanXatuNodes(ctx context.Context, client clickhouse.Client, queryTemplate string) ([]*pb.XatuNode, error) {
	var xatuNodes []*pb.XatuNode

	// Format query with client's network name
	query := fmt.Sprintf(queryTemplate, client.Network())

	if err := client.QueryWithScanner(ctx, query, func(scanner clickhouse.RowScanner) error {
		xatuNode, scanErr := ScanXatuNode(scanner)
		if scanErr != nil {
			return scanErr
		}

		if xatuNode != nil {
			xatuNodes = append(xatuNodes, xatuNode)
		}

		return nil
	}); err != nil {
		return nil, err
	}

	return xatuNodes, nil
}

// ScanXatuNode scans a single xatu node from a database row.
func ScanXatuNode(scanner clickhouse.RowScanner) (*pb.XatuNode, error) {
	var (
		xatuNode     pb.XatuNode
		lastSeenTime time.Time
	)

	if err := scanner.Scan(
		&xatuNode.Username,
		&xatuNode.NodeId,
		&xatuNode.Classification,
		&xatuNode.MetaClientName,
		&xatuNode.MetaClientVersion,
		&xatuNode.MetaClientImplementation,
		&xatuNode.MetaClientGeoCity,
		&xatuNode.MetaClientGeoCountry,
		&xatuNode.MetaClientGeoCountryCode,
		&xatuNode.MetaClientGeoContinentCode,
		&xatuNode.MetaConsensusVersion,
		&xatuNode.MetaConsensusImplementation,
		&lastSeenTime,
	); err != nil {
		return nil, err
	}

	// Handle time formatting directly.
	if !lastSeenTime.IsZero() {
		xatuNode.LastSeenDateTime = lastSeenTime.Format(time.RFC3339)
	}

	return &xatuNode, nil
}
