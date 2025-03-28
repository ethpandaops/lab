package examples

import (
	"context"
	"fmt"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"github.com/ethpandaops/lab/pkg/xatuclickhouse"
	"github.com/ethpandaops/lab/pkg/xatuclickhouse/utils"
)

// AggregationResult represents the result of an aggregation query
type AggregationResult struct {
	MetaClientName   string `db:"meta_client_name"`
	MaxSlot          uint64 `db:"max_slot"`
	MinSlot          uint64 `db:"min_slot"`
	AttestationCount uint64 `db:"attestation_count"`
}

// TableName implements the Model interface
func (r *AggregationResult) TableName() string {
	return "beacon_api_eth_v1_events_attestation"
}

// AggregationExamples demonstrates different ways to use aggregation functions
func AggregationExamples() {
	// Create a ClickHouse connection
	conn, err := clickhouse.Open(&clickhouse.Options{
		Addr: []string{"localhost:9000"},
		Auth: clickhouse.Auth{
			Database: "default",
			Username: "default",
			Password: "",
		},
	})
	if err != nil {
		panic(err)
	}

	// Create a Xatu ClickHouse client
	client := xatuclickhouse.NewXatuClickhouse(conn)

	ctx := context.Background()

	// Example 1: Get the maximum slot value from the beacon_api_eth_v1_events_attestation table
	maxSlot, err := client.ExecuteAggregate(
		ctx,
		"beacon_api_eth_v1_events_attestation",
		"MAX",
		"slot",
		nil,
	)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Maximum slot: %v\n", maxSlot)

	// Example 2: Get the count of attestations for a specific validator
	params := xatuclickhouse.BeaconApiEthV1EventsAttestationParams{
		StartSlot: utils.Ptr(uint32(1000000)),
		EndSlot:   utils.Ptr(uint32(1001000)),
	}
	conditions := xatuclickhouse.ExtractConditions(params)
	count, err := client.ExecuteAggregate(
		ctx,
		"beacon_api_eth_v1_events_attestation",
		"COUNT",
		"*",
		conditions,
	)
	if err != nil {
		panic(err)
	}
	fmt.Printf("Count of attestations between slots 1000000 and 1001000: %v\n", count)

	// Example 3: Get the average transactions per block by day
	lastMonth := time.Now().AddDate(0, -1, 0)
	conditions = map[string]interface{}{
		"StartBlockDateTime": lastMonth,
	}
	results, err := client.GroupByAggregate(
		ctx,
		"canonical_execution_block",
		"AVG",
		"transactions_count",
		[]string{"toDate(block_date_time)"},
		conditions,
		utils.Ptr(uint64(30)), // Limit to 30 days
	)
	if err != nil {
		panic(err)
	}

	fmt.Println("Average transactions per block by day:")
	for _, row := range results {
		date := row[0].(time.Time)
		avgTxCount := row[1].(float64)
		fmt.Printf("%s: %.2f\n", date.Format("2006-01-02"), avgTxCount)
	}

	// Example 4: Custom aggregation query with multiple aggregates and group by
	options := &xatuclickhouse.QueryOptions{
		Aggregations: []string{
			"MAX(slot) as max_slot",
			"MIN(slot) as min_slot",
			"COUNT(*) as attestation_count",
		},
		GroupBy: []string{"meta_client_name"},
		OrderBy: []string{"attestation_count DESC"},
	}

	// Create a model creator function
	newModel := func() xatuclickhouse.Model {
		return &AggregationResult{}
	}

	// Execute the query
	results2, err := client.QueryWithModelAndOptions(
		ctx,
		newModel,
		params,
		options,
	)
	if err != nil {
		panic(err)
	}

	fmt.Println("\nAttestation stats by client:")
	for _, result := range results2 {
		r := result.(*AggregationResult)
		fmt.Printf("Client: %s, Count: %d, Min Slot: %d, Max Slot: %d\n",
			r.MetaClientName, r.AttestationCount, r.MinSlot, r.MaxSlot)
	}
}
