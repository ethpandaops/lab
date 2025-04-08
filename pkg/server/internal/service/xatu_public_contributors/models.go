package xatu_public_contributors

import (
	"time"
)

// NodeCount represents a count of nodes for a specific country
type NodeCount struct {
	Country string `json:"country"`
	Count   int32  `json:"count"`
}

// NetworkStats represents statistics for a network
type NetworkStats struct {
	Network        string      `json:"network"`
	NodeCounts     []NodeCount `json:"node_counts"`
	TotalNodes     int32       `json:"total_nodes"`
	TotalCountries int32       `json:"total_countries"`
}

// SummaryData represents summary data for the dashboard
type SummaryData struct {
	Networks       []NetworkStats `json:"networks"`
	TotalNodes     int32          `json:"total_nodes"`
	TotalCountries int32          `json:"total_countries"`
}

// CountryDataPoint represents a data point for country statistics
type CountryDataPoint struct {
	Timestamp      time.Time   `json:"timestamp"`
	NodeCounts     []NodeCount `json:"node_counts"`
	TotalNodes     int32       `json:"total_nodes"`
	TotalCountries int32       `json:"total_countries"`
}

// UserDataPoint represents a data point for user statistics
type UserDataPoint struct {
	Timestamp time.Time `json:"timestamp"`
	UserCount int32     `json:"user_count"`
}

// UserSummary represents summary data for users
type UserSummary struct {
	CurrentUserCount int32           `json:"current_user_count"`
	DataPoints       []UserDataPoint `json:"data_points"`
}

// TopNetworks represents the top networks by node count
type TopNetworks struct {
	Networks []NetworkStats `json:"networks"`
}

// Note: ToProto and FromProto methods will be implemented after
// the proto package is generated correctly
