package experiments

// ExperimentTableMapping defines which ClickHouse tables each experiment depends on.
// This mapping is used to query data availability for each experiment.
var ExperimentTableMapping = map[string][]string{
	"live-slots": {
		"fct_block_head",
		"fct_block_first_seen_by_node",
		"fct_attestation_first_seen_chunked_50ms",
		"fct_attestation_correctness_head",
		"fct_block_proposer_entity",
		// Optional deps
		// "fct_block_blob_first_seen_by_node",
		// "fct_block_blob_count_head",
		// "fct_block_mev_head",
		// "fct_mev_bid_count_by_relay",
		// "fct_mev_bid_value_by_builder",
	},
	"block-production-flow": {
		"fct_block_head",
		"fct_block_first_seen_by_node",
		"fct_attestation_first_seen_chunked_50ms",
		"fct_attestation_correctness_head",
		"fct_block_proposer_entity",
		// Optional deps
		// "fct_block_blob_first_seen_by_node",
		// "fct_block_blob_count_head",
		// "fct_block_mev_head",
		// "fct_mev_bid_count_by_relay",
		// "fct_mev_bid_value_by_builder",
	},
	"historical-slots": {
		"fct_block",
	},
	"locally-built-blocks": {
		"fct_prepared_block",
	},
}

// GetTablesForExperiment returns the list of tables required for the given experiment.
func GetTablesForExperiment(experimentID string) []string {
	tables, exists := ExperimentTableMapping[experimentID]
	if !exists {
		// Return empty slice for unknown experiments
		return []string{}
	}

	return tables
}
