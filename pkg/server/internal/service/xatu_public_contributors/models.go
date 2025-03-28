package xatu_public_contributors

import "time"

// NodeCount represents a count of nodes, differentiated between total and public
type NodeCount struct {
	TotalNodes  int `json:"total_nodes"`
	PublicNodes int `json:"public_nodes"`
}

// NetworkStats represents statistics for a specific network
type NetworkStats struct {
	TotalNodes               int                  `json:"total_nodes"`
	TotalPublicNodes         int                  `json:"total_public_nodes"`
	Countries                map[string]NodeCount `json:"countries"`
	Continents               map[string]NodeCount `json:"continents"`
	Cities                   map[string]NodeCount `json:"cities"`
	ConsensusImplementations map[string]NodeCount `json:"consensus_implementations"`
}

// SummaryData represents the summary data for all networks
type SummaryData struct {
	UpdatedAt int64                   `json:"updated_at"` // Unix timestamp
	Networks  map[string]NetworkStats `json:"networks"`
}

// NewSummaryData creates a new SummaryData instance with initialized fields
func NewSummaryData(networks []string) *SummaryData {
	summary := &SummaryData{
		UpdatedAt: time.Now().UTC().Unix(),
		Networks:  make(map[string]NetworkStats),
	}

	// Initialize network stats for each network
	for _, network := range networks {
		summary.Networks[network] = NetworkStats{
			Countries:                make(map[string]NodeCount),
			Continents:               make(map[string]NodeCount),
			Cities:                   make(map[string]NodeCount),
			ConsensusImplementations: make(map[string]NodeCount),
		}
	}

	return summary
}

// TimeSeriesDataPoint represents a single data point in a time series
type TimeSeriesDataPoint struct {
	Time int64 `json:"time"` // Unix timestamp
}

// CountryDataPoint represents a country with its node count
type CountryDataPoint struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
}

// CountriesTimePoint represents countries data for a specific time
type CountriesTimePoint struct {
	Time      int64              `json:"time"` // Unix timestamp
	Countries []CountryDataPoint `json:"countries"`
}

// UserDataPoint represents a user with its node count
type UserDataPoint struct {
	Name  string `json:"name"`
	Value int    `json:"value"`
}

// UsersTimePoint represents users data for a specific time
type UsersTimePoint struct {
	Time  int64           `json:"time"` // Unix timestamp
	Users []UserDataPoint `json:"users"`
}

// UserSummary represents a summary for a specific user
type UserSummary struct {
	User       string         `json:"user"`
	Networks   map[string]int `json:"networks"`
	Countries  map[string]int `json:"countries"`
	Continents map[string]int `json:"continents"`
	Cities     map[string]int `json:"cities"`
	Clients    map[string]int `json:"clients"`
	FirstSeen  int64          `json:"first_seen"` // Unix timestamp
	LastSeen   int64          `json:"last_seen"`  // Unix timestamp
	TotalNodes int            `json:"total_nodes"`
}
