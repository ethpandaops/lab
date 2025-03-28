package xatu_public_contributors

import (
	"context"
	"encoding/json"
	"fmt"
	"path/filepath"
	"sort"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab"
	pb "github.com/ethpandaops/lab/pkg/proto/xatu_public_contributors"
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Activities holds implementations for all xatu public contributors activities
type Activities struct {
	log     logrus.FieldLogger
	lab     *lab.Lab
	baseDir string
	config  *Config
}

// NewActivities creates a new Activities
func NewActivities(log logrus.FieldLogger, lab *lab.Lab, baseDir string, config *Config) *Activities {
	return &Activities{
		log:     log,
		lab:     lab,
		baseDir: baseDir,
		config:  config,
	}
}

// ShouldProcessActivity checks if a processor should run
func (a *Activities) ShouldProcessActivity(ctx context.Context, params *pb.ProcessorParams) (bool, error) {
	a.log.WithFields(logrus.Fields{
		"network":   params.NetworkName,
		"processor": params.WindowName,
	}).Debug("Checking if should process")

	// Get the processor state
	state, err := a.getProcessorState(ctx, params.NetworkName, params.WindowName)
	if err != nil {
		return false, fmt.Errorf("failed to get processor state: %w", err)
	}

	// If we don't have state yet or it's been long enough since the last update, process
	if state.LastProcessed.AsTime().IsZero() {
		return true, nil
	}

	// Check if it's been long enough since the last update
	timeSinceLastUpdate := time.Since(state.LastProcessed.AsTime())
	if timeSinceLastUpdate > a.config.GetInterval() {
		return true, nil
	}

	return false, nil
}

// ShouldProcessWindowActivity checks if a specific window should be processed
func (a *Activities) ShouldProcessWindowActivity(ctx context.Context, params struct {
	NetworkName   string
	ProcessorName string
	WindowName    string
}) (bool, error) {
	a.log.WithFields(logrus.Fields{
		"network":   params.NetworkName,
		"processor": params.ProcessorName,
		"window":    params.WindowName,
	}).Debug("Checking if should process window")

	// Get the processor state
	state, err := a.getProcessorState(ctx, params.NetworkName, params.ProcessorName)
	if err != nil {
		return false, fmt.Errorf("failed to get processor state: %w", err)
	}

	// If we don't have window state yet, process
	if state.LastProcessedWindows == nil {
		return true, nil
	}

	lastProcessed, exists := state.LastProcessedWindows[params.WindowName]
	if !exists || lastProcessed.AsTime().IsZero() {
		return true, nil
	}

	// Find the window config
	var windowConfig *pb.TimeWindow
	for _, window := range a.config.TimeWindows {
		if window.File == params.WindowName {
			stepDuration, err := window.GetStepDuration()
			if err != nil {
				return false, fmt.Errorf("failed to parse step duration: %w", err)
			}

			// Check if it's been long enough since the last update
			timeSinceLastUpdate := time.Since(lastProcessed.AsTime())
			if timeSinceLastUpdate > stepDuration {
				return true, nil
			}

			return false, nil
		}
	}

	// If window not found, process to be safe
	return true, nil
}

// GetTimeWindowsActivity retrieves the configured time windows
func (a *Activities) GetTimeWindowsActivity(ctx context.Context, _ struct{}) ([]pb.TimeWindow, error) {
	a.log.Debug("Getting time windows")

	var result []pb.TimeWindow
	for _, window := range a.config.TimeWindows {
		result = append(result, pb.TimeWindow{
			File:  window.File,
			Step:  window.Step,
			Label: window.Label,
			Range: window.Range,
		})
	}

	return result, nil
}

// ProcessSummaryActivity processes summary data
func (a *Activities) ProcessSummaryActivity(ctx context.Context, params *pb.SummaryProcessorParams) error {
	a.log.WithFields(logrus.Fields{
		"network": params.NetworkName,
	}).Info("Processing summary data")

	// Get the last hour of data
	endTime := time.Now().UTC()
	startTime := endTime.Add(-time.Hour) // Last 1h

	// Query Clickhouse for data
	query := `
		SELECT
			meta_network_name,
			meta_client_geo_country as country,
			meta_client_geo_continent_code as continent,
			meta_client_geo_city as city,
			meta_client_name,
			meta_consensus_implementation,
			count(*) as count
		FROM beacon_api_eth_v1_events_block FINAL
		WHERE
			slot_start_date_time BETWEEN ? AND ?
			AND meta_network_name = ?
			AND meta_client_name != ''
			AND meta_client_name IS NOT NULL
		GROUP BY meta_network_name, country, continent, city, meta_client_name, meta_consensus_implementation
	`

	// Execute the query
	result, err := a.lab.Xatu().QueryClickhouseRows(query, startTime, endTime, params.NetworkName)
	if err != nil {
		return fmt.Errorf("failed to query clickhouse: %w", err)
	}
	defer result.Close()

	// Create summary data structure
	summary := &pb.SummaryData{
		UpdatedAt: time.Now().UTC().Unix(),
		Networks:  make(map[string]*pb.NetworkStats),
	}

	// Initialize network stats
	summary.Networks[params.NetworkName] = &pb.NetworkStats{
		Countries:                make(map[string]*pb.NodeCount),
		Continents:               make(map[string]*pb.NodeCount),
		Cities:                   make(map[string]*pb.NodeCount),
		ConsensusImplementations: make(map[string]*pb.NodeCount),
	}

	// Process rows
	for result.Next() {
		var network, country, continent, city, clientName, consensusImpl string
		var count int32

		if err := result.Scan(&network, &country, &continent, &city, &clientName, &consensusImpl, &count); err != nil {
			return fmt.Errorf("failed to scan row: %w", err)
		}

		// Check if client is public (not ethpandaops)
		isPublic := len(clientName) >= 12 && clientName[:12] != "ethpandaops"

		// Add to network totals
		summary.Networks[network].TotalNodes++
		if isPublic {
			summary.Networks[network].TotalPublicNodes++
		}

		// Add to countries
		if _, ok := summary.Networks[network].Countries[country]; !ok {
			summary.Networks[network].Countries[country] = &pb.NodeCount{}
		}
		summary.Networks[network].Countries[country].TotalNodes++
		if isPublic {
			summary.Networks[network].Countries[country].PublicNodes++
		}

		// Add to continents
		if _, ok := summary.Networks[network].Continents[continent]; !ok {
			summary.Networks[network].Continents[continent] = &pb.NodeCount{}
		}
		summary.Networks[network].Continents[continent].TotalNodes++
		if isPublic {
			summary.Networks[network].Continents[continent].PublicNodes++
		}

		// Add to cities
		if _, ok := summary.Networks[network].Cities[city]; !ok {
			summary.Networks[network].Cities[city] = &pb.NodeCount{}
		}
		summary.Networks[network].Cities[city].TotalNodes++
		if isPublic {
			summary.Networks[network].Cities[city].PublicNodes++
		}

		// Add to consensus implementations
		if _, ok := summary.Networks[network].ConsensusImplementations[consensusImpl]; !ok {
			summary.Networks[network].ConsensusImplementations[consensusImpl] = &pb.NodeCount{}
		}
		summary.Networks[network].ConsensusImplementations[consensusImpl].TotalNodes++
		if isPublic {
			summary.Networks[network].ConsensusImplementations[consensusImpl].PublicNodes++
		}
	}

	if err := result.Err(); err != nil {
		return fmt.Errorf("error in query result: %w", err)
	}

	// Store summary data
	key := filepath.Join(a.baseDir, params.NetworkName, "summary.json")
	data, err := json.Marshal(summary)
	if err != nil {
		return fmt.Errorf("failed to marshal summary data: %w", err)
	}

	// Store in S3
	if err := a.lab.Storage().StoreAtomic(key, data); err != nil {
		return fmt.Errorf("failed to store summary data: %w", err)
	}

	return nil
}

// ProcessCountriesWindowActivity processes countries data for a specific time window
func (a *Activities) ProcessCountriesWindowActivity(ctx context.Context, params struct {
	NetworkName string
	Window      pb.TimeWindow
}) error {
	a.log.WithFields(logrus.Fields{
		"network": params.NetworkName,
		"window":  params.Window.File,
	}).Info("Processing countries data")

	// Get time range for the window
	startTime, endTime := getTimeRangeFromWindow(params.Window)

	// Get step duration in seconds
	stepDuration, err := time.ParseDuration(params.Window.Step)
	if err != nil {
		return fmt.Errorf("failed to parse step duration: %w", err)
	}
	stepSeconds := int(stepDuration.Seconds())

	// Query Clickhouse for data
	query := `
		WITH time_slots AS (
			SELECT 
				toStartOfInterval(slot_start_date_time, INTERVAL ? second) as time_slot,
				meta_client_geo_country as country,
				meta_network_name,
				count(distinct meta_client_name) AS total
			FROM beacon_api_eth_v1_events_block FINAL
			WHERE
				slot_start_date_time BETWEEN ? AND ?
				AND meta_client_name NOT LIKE 'ethpandaops%'
				AND meta_network_name = ?
				AND meta_client_name != ''
				AND meta_client_name IS NOT NULL
			GROUP BY time_slot, country, meta_network_name
		)
		SELECT
			time_slot as time,
			country,
			meta_network_name,
			total
		FROM time_slots
	`

	// Execute the query
	result, err := a.lab.Xatu().QueryClickhouseRows(query, stepSeconds, startTime, endTime, params.NetworkName)
	if err != nil {
		return fmt.Errorf("failed to query clickhouse: %w", err)
	}
	defer result.Close()

	// Group results by timestamp
	type countryData struct {
		Name  string
		Value int32
	}

	timePoints := make(map[int64]*pb.CountriesTimePoint)

	// Process rows
	for result.Next() {
		var timestamp time.Time
		var country, network string
		var count int32

		if err := result.Scan(&timestamp, &country, &network, &count); err != nil {
			return fmt.Errorf("failed to scan row: %w", err)
		}

		// Convert to Unix timestamp
		unixTime := timestamp.Unix()

		// Add to time points
		if _, ok := timePoints[unixTime]; !ok {
			timePoints[unixTime] = &pb.CountriesTimePoint{
				Time:      unixTime,
				Countries: []*pb.CountryDataPoint{},
			}
		}

		// Add country data
		timePoints[unixTime].Countries = append(timePoints[unixTime].Countries, &pb.CountryDataPoint{
			Name:  country,
			Value: count,
		})
	}

	if err := result.Err(); err != nil {
		return fmt.Errorf("error in query result: %w", err)
	}

	// Convert map to slice and sort by time
	var timePointsList []*pb.CountriesTimePoint
	for _, point := range timePoints {
		timePointsList = append(timePointsList, point)
	}

	// Sort by time
	sort.Slice(timePointsList, func(i, j int) bool {
		return timePointsList[i].Time < timePointsList[j].Time
	})

	// Store data
	key := filepath.Join(a.baseDir, "countries", params.NetworkName, params.Window.File+".json")
	data, err := json.Marshal(timePointsList)
	if err != nil {
		return fmt.Errorf("failed to marshal countries data: %w", err)
	}

	// Store in S3
	if err := a.lab.Storage().StoreAtomic(key, data); err != nil {
		return fmt.Errorf("failed to store countries data: %w", err)
	}

	return nil
}

// ProcessUsersWindowActivity processes users data for a specific time window
func (a *Activities) ProcessUsersWindowActivity(ctx context.Context, params struct {
	NetworkName string
	Window      pb.TimeWindow
}) error {
	a.log.WithFields(logrus.Fields{
		"network": params.NetworkName,
		"window":  params.Window.File,
	}).Info("Processing users data")

	// Get time range for the window
	startTime, endTime := getTimeRangeFromWindow(params.Window)

	// Get step duration in seconds
	stepDuration, err := time.ParseDuration(params.Window.Step)
	if err != nil {
		return fmt.Errorf("failed to parse step duration: %w", err)
	}
	stepSeconds := int(stepDuration.Seconds())

	// Query Clickhouse for data - similar to countries but for users
	query := `
		WITH time_slots AS (
			SELECT 
				toStartOfInterval(slot_start_date_time, INTERVAL ? second) as time_slot,
				meta_client_name as user,
				meta_network_name,
				count(*) AS total
			FROM beacon_api_eth_v1_events_block FINAL
			WHERE
				slot_start_date_time BETWEEN ? AND ?
				AND meta_client_name NOT LIKE 'ethpandaops%'
				AND meta_network_name = ?
				AND meta_client_name != ''
				AND meta_client_name IS NOT NULL
			GROUP BY time_slot, user, meta_network_name
		)
		SELECT
			time_slot as time,
			user,
			meta_network_name,
			total
		FROM time_slots
	`

	// Execute the query
	result, err := a.lab.Xatu().QueryClickhouseRows(query, stepSeconds, startTime, endTime, params.NetworkName)
	if err != nil {
		return fmt.Errorf("failed to query clickhouse: %w", err)
	}
	defer result.Close()

	// Group results by timestamp
	timePoints := make(map[int64]*pb.UsersTimePoint)

	// Process rows
	for result.Next() {
		var timestamp time.Time
		var user, network string
		var count int32

		if err := result.Scan(&timestamp, &user, &network, &count); err != nil {
			return fmt.Errorf("failed to scan row: %w", err)
		}

		// Convert to Unix timestamp
		unixTime := timestamp.Unix()

		// Add to time points
		if _, ok := timePoints[unixTime]; !ok {
			timePoints[unixTime] = &pb.UsersTimePoint{
				Time:  unixTime,
				Users: []*pb.UserDataPoint{},
			}
		}

		// Add user data
		timePoints[unixTime].Users = append(timePoints[unixTime].Users, &pb.UserDataPoint{
			Name:  user,
			Value: count,
		})
	}

	if err := result.Err(); err != nil {
		return fmt.Errorf("error in query result: %w", err)
	}

	// Convert map to slice and sort by time
	var timePointsList []*pb.UsersTimePoint
	for _, point := range timePoints {
		timePointsList = append(timePointsList, point)
	}

	// Sort by time
	sort.Slice(timePointsList, func(i, j int) bool {
		return timePointsList[i].Time < timePointsList[j].Time
	})

	// Store data
	key := filepath.Join(a.baseDir, "users", params.NetworkName, params.Window.File+".json")
	data, err := json.Marshal(timePointsList)
	if err != nil {
		return fmt.Errorf("failed to marshal users data: %w", err)
	}

	// Store in S3
	if err := a.lab.Storage().StoreAtomic(key, data); err != nil {
		return fmt.Errorf("failed to store users data: %w", err)
	}

	return nil
}

// ProcessUserSummariesActivity processes user summaries
func (a *Activities) ProcessUserSummariesActivity(ctx context.Context, params *pb.UserSummariesProcessorParams) error {
	a.log.WithFields(logrus.Fields{
		"network": params.NetworkName,
	}).Info("Processing user summaries")

	// Query Clickhouse for user data
	query := `
		SELECT
			meta_client_name as user,
			meta_network_name as network,
			meta_client_geo_country as country,
			meta_client_geo_continent_code as continent,
			meta_client_geo_city as city,
			meta_client_implementation as client,
			min(slot_start_date_time) as first_seen,
			max(slot_start_date_time) as last_seen,
			count(*) as total_nodes
		FROM beacon_api_eth_v1_events_block FINAL
		WHERE
			meta_client_name NOT LIKE 'ethpandaops%'
			AND meta_network_name = ?
			AND meta_client_name != ''
			AND meta_client_name IS NOT NULL
		GROUP BY user, network, country, continent, city, client
	`

	// Execute the query
	result, err := a.lab.Xatu().QueryClickhouseRows(query, params.NetworkName)
	if err != nil {
		return fmt.Errorf("failed to query clickhouse: %w", err)
	}
	defer result.Close()

	// Group results by user
	type userSummary struct {
		User       string
		Networks   map[string]int32
		Countries  map[string]int32
		Continents map[string]int32
		Cities     map[string]int32
		Clients    map[string]int32
		FirstSeen  time.Time
		LastSeen   time.Time
		TotalNodes int32
	}

	userSummaries := make(map[string]*userSummary)

	// Process rows
	for result.Next() {
		var user, network, country, continent, city, client string
		var firstSeen, lastSeen time.Time
		var totalNodes int32

		if err := result.Scan(&user, &network, &country, &continent, &city, &client, &firstSeen, &lastSeen, &totalNodes); err != nil {
			return fmt.Errorf("failed to scan row: %w", err)
		}

		// Get or create user summary
		if _, ok := userSummaries[user]; !ok {
			userSummaries[user] = &userSummary{
				User:       user,
				Networks:   make(map[string]int32),
				Countries:  make(map[string]int32),
				Continents: make(map[string]int32),
				Cities:     make(map[string]int32),
				Clients:    make(map[string]int32),
				FirstSeen:  firstSeen,
				LastSeen:   lastSeen,
				TotalNodes: 0,
			}
		}

		summary := userSummaries[user]

		// Update first/last seen
		if firstSeen.Before(summary.FirstSeen) {
			summary.FirstSeen = firstSeen
		}
		if lastSeen.After(summary.LastSeen) {
			summary.LastSeen = lastSeen
		}

		// Update maps
		summary.Networks[network] += totalNodes
		summary.Countries[country] += totalNodes
		summary.Continents[continent] += totalNodes
		summary.Cities[city] += totalNodes
		summary.Clients[client] += totalNodes

		// Update total
		summary.TotalNodes += totalNodes
	}

	if err := result.Err(); err != nil {
		return fmt.Errorf("error in query result: %w", err)
	}

	// Store each user summary
	for user, summary := range userSummaries {
		// Convert to protobuf
		pbSummary := &pb.UserSummary{
			User:       user,
			Networks:   summary.Networks,
			Countries:  summary.Countries,
			Continents: summary.Continents,
			Cities:     summary.Cities,
			Clients:    summary.Clients,
			FirstSeen:  summary.FirstSeen.Unix(),
			LastSeen:   summary.LastSeen.Unix(),
			TotalNodes: summary.TotalNodes,
		}

		// Store in S3
		key := filepath.Join(a.baseDir, "user_summaries", params.NetworkName, user+".json")
		data, err := json.Marshal(pbSummary)
		if err != nil {
			return fmt.Errorf("failed to marshal user summary: %w", err)
		}

		if err := a.lab.Storage().StoreAtomic(key, data); err != nil {
			return fmt.Errorf("failed to store user summary: %w", err)
		}
	}

	return nil
}

// UpdateProcessorStateActivity updates the last processed time for a processor
func (a *Activities) UpdateProcessorStateActivity(ctx context.Context, params *pb.ProcessorParams) error {
	a.log.WithFields(logrus.Fields{
		"network":   params.NetworkName,
		"processor": params.WindowName,
	}).Debug("Updating processor state")

	// Get the current state
	state, err := a.getProcessorState(ctx, params.NetworkName, params.WindowName)
	if err != nil {
		state = &pb.ProcessorState{
			Network:              params.NetworkName,
			Processor:            params.WindowName,
			LastProcessed:        timestamppb.New(time.Time{}),
			LastProcessedWindows: make(map[string]*timestamppb.Timestamp),
		}
	}

	// Update the state
	state.LastProcessed = timestamppb.New(time.Now().UTC())

	// Store the state
	if err := a.storeProcessorState(ctx, params.NetworkName, params.WindowName, state); err != nil {
		return fmt.Errorf("failed to store processor state: %w", err)
	}

	return nil
}

// UpdateWindowProcessorStateActivity updates the last processed time for a specific window
func (a *Activities) UpdateWindowProcessorStateActivity(ctx context.Context, params struct {
	NetworkName   string
	ProcessorName string
	WindowName    string
}) error {
	a.log.WithFields(logrus.Fields{
		"network":   params.NetworkName,
		"processor": params.ProcessorName,
		"window":    params.WindowName,
	}).Debug("Updating window processor state")

	// Get the current state
	state, err := a.getProcessorState(ctx, params.NetworkName, params.ProcessorName)
	if err != nil {
		state = &pb.ProcessorState{
			Network:              params.NetworkName,
			Processor:            params.ProcessorName,
			LastProcessed:        timestamppb.New(time.Time{}),
			LastProcessedWindows: make(map[string]*timestamppb.Timestamp),
		}
	}

	// Initialize last processed windows if needed
	if state.LastProcessedWindows == nil {
		state.LastProcessedWindows = make(map[string]*timestamppb.Timestamp)
	}

	// Update the window state
	state.LastProcessedWindows[params.WindowName] = timestamppb.New(time.Now().UTC())

	// Store the state
	if err := a.storeProcessorState(ctx, params.NetworkName, params.ProcessorName, state); err != nil {
		return fmt.Errorf("failed to store processor state: %w", err)
	}

	return nil
}

// Helper functions

// getProcessorState retrieves the processor state from S3
func (a *Activities) getProcessorState(ctx context.Context, network, processor string) (*pb.ProcessorState, error) {
	// Create path for the state file
	statePath := filepath.Join(a.baseDir, "state", network, fmt.Sprintf("%s.json", processor))

	// Check if file exists
	exists, err := a.lab.Storage().Exists(statePath)
	if err != nil {
		return nil, fmt.Errorf("failed to check if state file exists: %w", err)
	}

	if !exists {
		// Return default state
		return &pb.ProcessorState{
			Network:              network,
			Processor:            processor,
			LastProcessed:        timestamppb.New(time.Time{}),
			LastProcessedWindows: make(map[string]*timestamppb.Timestamp),
		}, nil
	}

	// Get the state file
	data, err := a.lab.Storage().Get(statePath)
	if err != nil {
		return nil, fmt.Errorf("failed to get state file: %w", err)
	}

	// Unmarshal the state file
	var state pb.ProcessorState
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("failed to unmarshal state file: %w", err)
	}

	return &state, nil
}

// storeProcessorState stores the processor state in S3
func (a *Activities) storeProcessorState(ctx context.Context, network, processor string, state *pb.ProcessorState) error {
	// Create path for the state file
	statePath := filepath.Join(a.baseDir, "state", network, fmt.Sprintf("%s.json", processor))

	// Marshal the state
	data, err := json.Marshal(state)
	if err != nil {
		return fmt.Errorf("failed to marshal state: %w", err)
	}

	// Store the state file
	if err := a.lab.Storage().StoreAtomic(statePath, data); err != nil {
		return fmt.Errorf("failed to store state file: %w", err)
	}

	return nil
}

// getTimeRangeFromWindow returns the start and end time for a window
func getTimeRangeFromWindow(window pb.TimeWindow) (time.Time, time.Time) {
	end := time.Now().UTC()

	// Parse range (like "-90d")
	valueStr := window.Range[1 : len(window.Range)-1]
	unit := window.Range[len(window.Range)-1:]

	var value int
	_, err := fmt.Sscanf(valueStr, "%d", &value)
	if err != nil {
		return end, end
	}

	var start time.Time
	switch unit {
	case "d":
		start = end.AddDate(0, 0, -value)
	case "h":
		start = end.Add(-time.Hour * time.Duration(value))
	default:
		start = end
	}

	return start, end
}
