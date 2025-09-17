package experiments

// ExperimentTableMapping defines which ClickHouse tables each experiment depends on.
// This mapping is used to query data availability for each experiment.
var ExperimentTableMapping = map[string][]string{
	"live-slots": {
		"fct_block",
	},
	"block-production-flow": {
		"fct_block",
	},
	"historical-slots": {
		"fct_block",
	},
	"locally-built-blocks": {
		"fct_block",
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
