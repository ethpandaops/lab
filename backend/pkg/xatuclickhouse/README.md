# Xatu ClickHouse Examples

This directory contains examples demonstrating how to use the Xatu ClickHouse client.

## Aggregation Examples

The `aggregate_examples.go` file demonstrates various ways to perform aggregation queries using the Xatu ClickHouse client:

### Simple Aggregation

Use the `ExecuteAggregate` method to perform simple aggregation queries like MAX, MIN, COUNT, SUM, or AVG:

```go
// Get the maximum slot value
maxSlot, err := client.ExecuteAggregate(
    ctx,
    "beacon_api_eth_v1_events_attestation",
    "MAX",
    "slot",
    nil,
)

// Get the count of attestations with conditions
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
```

### Group By Aggregations

Use the `GroupByAggregate` method to perform aggregation with a GROUP BY clause:

```go
// Get average transactions per block by day
conditions := map[string]interface{}{
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

// Process the results
for _, row := range results {
    date := row[0].(time.Time)
    avgTxCount := row[1].(float64)
    fmt.Printf("%s: %.2f\n", date.Format("2006-01-02"), avgTxCount)
}
```

### Custom Aggregation Queries

For more complex queries with multiple aggregations, use `QueryWithModelAndOptions` with a custom struct:

```go
// Define a struct to hold the results
type AggregationResult struct {
    MetaClientName   string `db:"meta_client_name"`
    MaxSlot          uint64 `db:"max_slot"`
    MinSlot          uint64 `db:"min_slot"`
    AttestationCount uint64 `db:"attestation_count"`
}

// Implement TableName method to satisfy the Model interface
func (r *AggregationResult) TableName() string {
    return "beacon_api_eth_v1_events_attestation"
}

// Define query options
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
results, err := client.QueryWithModelAndOptions(
    ctx,
    newModel,
    params,
    options,
)
```

## Running the Examples

To run the examples, ensure you have a ClickHouse server running and update the connection details accordingly. 