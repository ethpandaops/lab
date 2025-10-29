package state_analytics

import (
	"strings"
	"testing"
)

// TestConstants verifies that our constants are set correctly
func TestConstants(t *testing.T) {
	tests := []struct {
		name     string
		value    int
		expected int
	}{
		{"BytesPerSlot", BytesPerSlot, 191},
		{"BlocksPerHour", BlocksPerHour, 300},
		{"BlocksPer24Hours", BlocksPer24Hours, 7200},
		{"BlocksPer7Days", BlocksPer7Days, 50400},
		{"BlocksPer30Days", BlocksPer30Days, 216000},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.value != tt.expected {
				t.Errorf("%s = %d, expected %d", tt.name, tt.value, tt.expected)
			}
		})
	}
}

// TestQueryTemplatesExist verifies that all query templates are defined and non-empty
func TestQueryTemplatesExist(t *testing.T) {
	queries := map[string]string{
		"queryLatestBlockDelta":             queryLatestBlockDelta,
		"queryLatestBlockTopContributors":   queryLatestBlockTopContributors,
		"queryTopStateAdders":               queryTopStateAdders,
		"queryTopStateRemovers":             queryTopStateRemovers,
		"queryStateGrowthChart":             queryStateGrowthChart,
		"queryBlockNumberFromTimestamp":     queryBlockNumberFromTimestamp,
	}

	for name, query := range queries {
		t.Run(name, func(t *testing.T) {
			if query == "" {
				t.Errorf("Query template %s is empty", name)
			}
			if len(query) < 50 {
				t.Errorf("Query template %s seems too short (%d chars), might be incomplete", name, len(query))
			}
		})
	}
}

// TestQueryTemplatesHavePlaceholders verifies that query templates have the expected placeholders
func TestQueryTemplatesHavePlaceholders(t *testing.T) {
	tests := []struct {
		name         string
		query        string
		placeholders []string
	}{
		{
			name:         "queryLatestBlockDelta",
			query:        queryLatestBlockDelta,
			placeholders: []string{"{database}"},
		},
		{
			name:         "queryLatestBlockTopContributors",
			query:        queryLatestBlockTopContributors,
			placeholders: []string{"{database}", "{bytes_per_slot}"},
		},
		{
			name:         "queryTopStateAdders",
			query:        queryTopStateAdders,
			placeholders: []string{"{database}", "{blocks_in_period}", "{bytes_per_slot}", "{limit}"},
		},
		{
			name:         "queryTopStateRemovers",
			query:        queryTopStateRemovers,
			placeholders: []string{"{database}", "{blocks_in_period}", "{bytes_per_slot}", "{limit}"},
		},
		{
			name:         "queryStateGrowthChart",
			query:        queryStateGrowthChart,
			placeholders: []string{"{database}", "{blocks_in_period}", "{time_bucket_expression}", "{bytes_per_slot}"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			for _, placeholder := range tt.placeholders {
				if !strings.Contains(tt.query, placeholder) {
					t.Errorf("Query %s is missing placeholder: %s", tt.name, placeholder)
				}
			}
		})
	}
}

// TestQueryTemplatesSQLSyntax does basic SQL syntax validation
func TestQueryTemplatesSQLSyntax(t *testing.T) {
	queries := map[string]string{
		"queryLatestBlockDelta":           queryLatestBlockDelta,
		"queryLatestBlockTopContributors": queryLatestBlockTopContributors,
		"queryTopStateAdders":             queryTopStateAdders,
		"queryTopStateRemovers":           queryTopStateRemovers,
		"queryStateGrowthChart":           queryStateGrowthChart,
	}

	for name, query := range queries {
		t.Run(name, func(t *testing.T) {
			// Check for balanced parentheses
			openCount := strings.Count(query, "(")
			closeCount := strings.Count(query, ")")
			if openCount != closeCount {
				t.Errorf("Query %s has unbalanced parentheses: %d open, %d close", name, openCount, closeCount)
			}

			// Check that query starts with SELECT, WITH, or whitespace
			trimmed := strings.TrimSpace(query)
			if !strings.HasPrefix(trimmed, "SELECT") && !strings.HasPrefix(trimmed, "WITH") {
				t.Errorf("Query %s doesn't start with SELECT or WITH", name)
			}

			// Check for common ClickHouse keywords
			upperQuery := strings.ToUpper(query)
			if !strings.Contains(upperQuery, "SELECT") {
				t.Errorf("Query %s is missing SELECT keyword", name)
			}
			if !strings.Contains(upperQuery, "FROM") {
				t.Errorf("Query %s is missing FROM keyword", name)
			}
		})
	}
}

// TestBlockTimeCalculations verifies that block time calculations are correct
func TestBlockTimeCalculations(t *testing.T) {
	// With 12 second block time:
	// 1 hour = 3600s / 12s = 300 blocks
	// 24 hours = 300 * 24 = 7200 blocks
	// 7 days = 7200 * 7 = 50400 blocks
	// 30 days = 7200 * 30 = 216000 blocks

	if BlocksPerHour != 3600/12 {
		t.Errorf("BlocksPerHour calculation incorrect: got %d, expected %d", BlocksPerHour, 3600/12)
	}

	if BlocksPer24Hours != BlocksPerHour*24 {
		t.Errorf("BlocksPer24Hours calculation incorrect: got %d, expected %d", BlocksPer24Hours, BlocksPerHour*24)
	}

	if BlocksPer7Days != BlocksPer24Hours*7 {
		t.Errorf("BlocksPer7Days calculation incorrect: got %d, expected %d", BlocksPer7Days, BlocksPer24Hours*7)
	}

	if BlocksPer30Days != BlocksPer24Hours*30 {
		t.Errorf("BlocksPer30Days calculation incorrect: got %d, expected %d", BlocksPer30Days, BlocksPer24Hours*30)
	}
}
