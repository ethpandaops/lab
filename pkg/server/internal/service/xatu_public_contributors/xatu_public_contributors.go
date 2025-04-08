package xatu_public_contributors

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	pb "github.com/ethpandaops/lab/pkg/server/proto/xatu_public_contributors"
	"github.com/sirupsen/logrus"
)

const (
	XatuPublicContributorsServiceName = "xatu_public_contributors"
	SummaryProcessorName              = "summary"
	CountriesProcessorName            = "countries"
	UsersProcessorName                = "users"
	UserSummariesProcessorName        = "user_summaries"
)

type XatuPublicContributors struct {
	log logrus.FieldLogger

	config *Config

	ethereumConfig *ethereum.Config
	xatuClient     *xatu.Client
	storageClient  storage.Client
	cacheClient    cache.Client // Keep cache client if needed later, though not used currently
	lockerClient   locker.Locker

	leaderClient leader.Client

	processCtx       context.Context
	processCtxCancel context.CancelFunc

	// Base directory for storage
	baseDir string
}

func New(
	log logrus.FieldLogger,
	config *Config,
	ethereumConfig *ethereum.Config,
	xatuClient *xatu.Client,
	storageClient storage.Client,
	cacheClient cache.Client,
	lockerClient locker.Locker,
) (*XatuPublicContributors, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid xatu_public_contributors config: %w", err)
	}

	return &XatuPublicContributors{
		log:            log.WithField("component", "service/"+XatuPublicContributorsServiceName),
		config:         config,
		ethereumConfig: ethereumConfig,
		xatuClient:     xatuClient,
		storageClient:  storageClient,
		cacheClient:    cacheClient,
		lockerClient:   lockerClient,

		baseDir: XatuPublicContributorsServiceName,

		processCtx:       nil,
		processCtxCancel: nil,
	}, nil
}

func (b *XatuPublicContributors) Start(ctx context.Context) error {
	if !b.config.Enabled {
		b.log.Info("XatuPublicContributors service disabled")
		return nil
	}
	b.log.Info("Starting XatuPublicContributors service")

	leader := leader.New(b.log, b.lockerClient, leader.Config{
		Resource:        XatuPublicContributorsServiceName + "/batch_processing",
		TTL:             15 * time.Minute, // Align with interval? Or keep longer?
		RefreshInterval: 5 * time.Second,

		OnElected: func() {
			b.log.Info("Became leader")
			if b.processCtx != nil {
				b.log.Info("Already processing, skipping start")
				return
			}
			ctx, cancel := context.WithCancel(context.Background())
			b.processCtx = ctx
			b.processCtxCancel = cancel
			go b.processLoop()
		},
		OnRevoked: func() {
			b.log.Info("Lost leadership")
			if b.processCtxCancel != nil {
				b.processCtxCancel()
				b.processCtx = nil
				b.processCtxCancel = nil
			}
		},
	})

	leader.Start()
	b.leaderClient = leader

	return nil
}

func (b *XatuPublicContributors) Stop() {
	b.log.Info("Stopping XatuPublicContributors service")
	if b.leaderClient != nil {
		b.leaderClient.Stop()
	}
	if b.processCtxCancel != nil {
		b.processCtxCancel()
	}
}

func (b *XatuPublicContributors) Name() string {
	return XatuPublicContributorsServiceName
}

func (b *XatuPublicContributors) processLoop() {
	ticker := time.NewTicker(time.Second * 15)
	defer ticker.Stop()

	// Initial processing run immediately if leader
	if b.leaderClient.IsLeader() {
		b.process()
	}

	for {
		select {
		case <-b.processCtx.Done():
			b.log.Info("Context cancelled, stopping processing loop")
			return
		case <-ticker.C:
			if b.leaderClient.IsLeader() {
				b.process()
			} else {
				b.log.Debug("Not leader, skipping processing cycle")
			}
		}
	}
}

// getStoragePath constructs the full storage path.
func (b *XatuPublicContributors) getStoragePath(key string) string {
	return fmt.Sprintf("%s/%s", b.baseDir, key)
}

// loadState loads the state for a given network.
func (b *XatuPublicContributors) loadState(network string) (*State, error) {
	state := &State{
		Processors: make(map[string]ProcessorState),
	}
	key := GetStateKey(network)
	err := b.storageClient.GetEncoded(b.getStoragePath(key), state, storage.CodecNameJSON)
	if err != nil {
		if err == storage.ErrNotFound {
			b.log.WithField("network", network).Info("No previous state found, starting fresh.")
			return state, nil // Return empty state if not found
		}
		return nil, fmt.Errorf("failed to get state for network %s: %w", network, err)
	}
	// Ensure nested maps are initialized after loading
	for name, procState := range state.Processors {
		if procState.LastProcessedWindows == nil {
			procState.LastProcessedWindows = make(map[string]time.Time)
			state.Processors[name] = procState
		}
	}
	return state, nil
}

// saveState saves the state for a given network.
func (b *XatuPublicContributors) saveState(network string, state *State) error {
	key := GetStateKey(network)
	_, err := b.storageClient.StoreEncoded(b.getStoragePath(key), state, storage.CodecNameJSON)
	if err != nil {
		return fmt.Errorf("failed to store state for network %s: %w", network, err)
	}
	return nil
}

// shouldProcess checks if a processor should run based on the last run time and interval.
func (b *XatuPublicContributors) shouldProcess(processorName string, lastProcessed time.Time) bool {
	if lastProcessed.IsZero() {
		return true // Never processed before
	}
	return time.Since(lastProcessed) > b.config.GetInterval()
}

// shouldProcessWindow checks if a specific window within a processor should run.
func (b *XatuPublicContributors) shouldProcessWindow(windowConfig pb.TimeWindow, lastProcessedWindow time.Time) (bool, error) {
	if lastProcessedWindow.IsZero() {
		return true, nil // Never processed before
	}

	stepDuration, err := windowConfig.GetStepDuration()
	if err != nil {
		return false, fmt.Errorf("failed to parse step duration for window %s: %w", windowConfig.File, err)
	}

	// Process if the time since last update is greater than the step duration
	return time.Since(lastProcessedWindow) > stepDuration, nil
}

// process is the main function called periodically to process data.
func (b *XatuPublicContributors) process() {
	b.log.Info("Starting processing cycle")
	startTime := time.Now()

	// Process each configured network
	networksToProcess := b.config.Networks
	if len(networksToProcess) == 0 {
		// Default to all networks from ethereum config if none specified
		for _, net := range b.ethereumConfig.Networks {
			networksToProcess = append(networksToProcess, net.Name)
		}
	}

	for _, networkName := range networksToProcess {
		log := b.log.WithField("network", networkName)
		log.Info("Processing network")

		// Load state for the network
		state, err := b.loadState(networkName)
		if err != nil {
			log.WithError(err).Error("Failed to load state, skipping network")
			continue
		}

		networkNeedsSave := false // Track if state needs saving for this network

		// --- Process Summary ---
		processorState := state.GetProcessorState(SummaryProcessorName)
		if b.shouldProcess(SummaryProcessorName, processorState.LastProcessed) {
			log.Info("Processing summary")
			if err := b.processSummary(networkName); err != nil {
				log.WithError(err).Error("Failed to process summary")
			} else {
				processorState.LastProcessed = time.Now().UTC()
				state.UpdateProcessorState(SummaryProcessorName, processorState)
				networkNeedsSave = true
				log.Info("Successfully processed summary")
			}
		} else {
			log.Debug("Skipping summary processing (interval not met)")
		}

		// --- Process Countries ---
		processorState = state.GetProcessorState(CountriesProcessorName)
		if b.shouldProcess(CountriesProcessorName, processorState.LastProcessed) {
			log.Info("Processing countries")
			processedAnyWindow := false
			for _, window := range b.config.TimeWindows {
				windowLog := log.WithField("window", window.File)
				should, err := b.shouldProcessWindow(window, processorState.LastProcessedWindows[window.File])
				if err != nil {
					windowLog.WithError(err).Error("Failed to check if should process countries window")
					continue
				}

				if should {
					windowLog.Info("Processing countries window")
					if err := b.processCountriesWindow(networkName, window); err != nil {
						windowLog.WithError(err).Error("Failed to process countries window")
					} else {
						processorState.LastProcessedWindows[window.File] = time.Now().UTC()
						processedAnyWindow = true
						windowLog.Info("Successfully processed countries window")
					}
				} else {
					windowLog.Debug("Skipping countries window processing (step interval not met)")
				}
			}
			// Update main processor time only if any window was processed in this cycle
			if processedAnyWindow {
				processorState.LastProcessed = time.Now().UTC()
				state.UpdateProcessorState(CountriesProcessorName, processorState)
				networkNeedsSave = true
				log.Info("Finished processing countries windows")
			} else {
				log.Debug("No country windows needed processing in this cycle")
			}
		} else {
			log.Debug("Skipping countries processing (interval not met)")
		}

		// --- Process Users ---
		processorState = state.GetProcessorState(UsersProcessorName)
		if b.shouldProcess(UsersProcessorName, processorState.LastProcessed) {
			log.Info("Processing users")
			processedAnyWindow := false
			for _, window := range b.config.TimeWindows {
				windowLog := log.WithField("window", window.File)
				should, err := b.shouldProcessWindow(window, processorState.LastProcessedWindows[window.File])
				if err != nil {
					windowLog.WithError(err).Error("Failed to check if should process users window")
					continue
				}

				if should {
					windowLog.Info("Processing users window")
					if err := b.processUsersWindow(networkName, window); err != nil {
						windowLog.WithError(err).Error("Failed to process users window")
					} else {
						processorState.LastProcessedWindows[window.File] = time.Now().UTC()
						processedAnyWindow = true
						windowLog.Info("Successfully processed users window")
					}
				} else {
					windowLog.Debug("Skipping users window processing (step interval not met)")
				}
			}
			if processedAnyWindow {
				processorState.LastProcessed = time.Now().UTC()
				state.UpdateProcessorState(UsersProcessorName, processorState)
				networkNeedsSave = true
				log.Info("Finished processing users windows")
			} else {
				log.Debug("No user windows needed processing in this cycle")
			}
		} else {
			log.Debug("Skipping users processing (interval not met)")
		}

		// --- Process User Summaries ---
		processorState = state.GetProcessorState(UserSummariesProcessorName)
		if b.shouldProcess(UserSummariesProcessorName, processorState.LastProcessed) {
			log.Info("Processing user summaries")
			if err := b.processUserSummaries(networkName); err != nil {
				log.WithError(err).Error("Failed to process user summaries")
			} else {
				processorState.LastProcessed = time.Now().UTC()
				state.UpdateProcessorState(UserSummariesProcessorName, processorState)
				networkNeedsSave = true
				log.Info("Successfully processed user summaries")
			}
		} else {
			log.Debug("Skipping user summaries processing (interval not met)")
		}

		// Save state if changed
		if networkNeedsSave {
			if err := b.saveState(networkName, state); err != nil {
				log.WithError(err).Error("Failed to save state")
			} else {
				log.Debug("Successfully saved state")
			}
		}
	}

	b.log.WithField("duration", time.Since(startTime)).Info("Finished processing cycle")
}

// --- Processing Logic (Moved from Activities) ---

// processSummary processes summary data
func (b *XatuPublicContributors) processSummary(networkName string) error {
	log := b.log.WithFields(logrus.Fields{
		"network":   networkName,
		"processor": SummaryProcessorName,
	})
	log.Info("Processing summary data")

	endTime := time.Now().UTC()
	startTime := endTime.Add(-time.Hour) // Last 1h

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
			slot_start_date_time BETWEEN $1 AND $2
			AND meta_network_name = $3
			AND meta_client_name != ''
			AND meta_client_name IS NOT NULL
		GROUP BY meta_network_name, country, continent, city, meta_client_name, meta_consensus_implementation
	`

	rows, err := b.xatuClient.GetClickhouseClientForNetwork(networkName).Query(query, startTime, endTime, networkName)
	if err != nil {
		return fmt.Errorf("failed to query clickhouse for summary: %w", err)
	}

	// Use models defined in models.go
	summary := NewSummaryData([]string{networkName}) // Initialize for the current network

	for _, row := range rows {
		network, _ := row["meta_network_name"].(string)
		country, _ := row["country"].(string)
		continent, _ := row["continent"].(string)
		city, _ := row["city"].(string)
		clientName, _ := row["meta_client_name"].(string)
		consensusImpl, _ := row["meta_consensus_implementation"].(string)
		count, _ := row["count"].(int) // Assuming count is int from query

		// Ensure network exists in summary (should always be networkName)
		if _, ok := summary.Networks[network]; !ok {
			log.Warnf("Unexpected network '%s' found in summary query results for network '%s'", network, networkName)
			continue
		}
		networkStats := summary.Networks[network] // Get pointer to modify

		// Check if client is public (not ethpandaops)
		isPublic := len(clientName) < 12 || clientName[:12] != "ethpandaops"

		// Add to network totals
		networkStats.TotalNodes += count
		if isPublic {
			networkStats.TotalPublicNodes += count
		}

		// Add to countries
		nodeCount := networkStats.Countries[country]
		nodeCount.TotalNodes += count
		if isPublic {
			nodeCount.PublicNodes += count
		}
		networkStats.Countries[country] = nodeCount

		// Add to continents
		nodeCount = networkStats.Continents[continent]
		nodeCount.TotalNodes += count
		if isPublic {
			nodeCount.PublicNodes += count
		}
		networkStats.Continents[continent] = nodeCount

		// Add to cities
		nodeCount = networkStats.Cities[city]
		nodeCount.TotalNodes += count
		if isPublic {
			nodeCount.PublicNodes += count
		}
		networkStats.Cities[city] = nodeCount

		// Add to consensus implementations
		nodeCount = networkStats.ConsensusImplementations[consensusImpl]
		nodeCount.TotalNodes += count
		if isPublic {
			nodeCount.PublicNodes += count
		}
		networkStats.ConsensusImplementations[consensusImpl] = nodeCount

		// Put the modified stats back (since map stores copies of structs)
		summary.Networks[network] = networkStats
	}

	// Store summary data
	key := filepath.Join(networkName, "summary.json") // Relative path within service baseDir
	_, err = b.storageClient.StoreEncoded(b.getStoragePath(key), summary, storage.CodecNameJSON)
	if err != nil {
		return fmt.Errorf("failed to store summary data: %w", err)
	}

	return nil
}

// processCountriesWindow processes countries data for a specific time window
func (b *XatuPublicContributors) processCountriesWindow(networkName string, window TimeWindow) error {
	log := b.log.WithFields(logrus.Fields{
		"network":   networkName,
		"processor": CountriesProcessorName,
		"window":    window.File,
	})
	log.Info("Processing countries window")

	startTime, endTime := window.GetTimeRange(time.Now().UTC())
	stepDuration, err := window.GetStepDuration()
	if err != nil {
		return fmt.Errorf("failed to parse step duration: %w", err)
	}
	stepSeconds := int(stepDuration.Seconds())

	query := `
		WITH time_slots AS (
			SELECT
				toStartOfInterval(slot_start_date_time, INTERVAL $1 second) as time_slot,
				meta_client_geo_country as country,
				meta_network_name,
				count(distinct meta_client_name) AS total
			FROM beacon_api_eth_v1_events_block FINAL
			WHERE
				slot_start_date_time BETWEEN $2 AND $3
				AND meta_client_name NOT LIKE 'ethpandaops%'
				AND meta_network_name = $4
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
		ORDER BY time_slot
	`

	rows, err := b.xatuClient.GetClickhouseClientForNetwork(networkName).Query(query, stepSeconds, startTime, endTime, networkName)
	if err != nil {
		return fmt.Errorf("failed to query clickhouse for countries window: %w", err)
	}

	timePoints := make(map[int64]*pb.CountriesTimePoint)

	for _, row := range rows {
		timestamp, ok := row["time"].(time.Time)
		if !ok {
			log.Warnf("Could not parse time from row: %v", row)
			continue
		}
		country, _ := row["country"].(string)
		// network, _ := row["meta_network_name"].(string) // Already known
		count, ok := row["total"].(int) // Assuming int
		if !ok {
			log.Warnf("Could not parse total count from row: %v", row)
			continue
		}

		unixTime := timestamp.Unix()

		if _, ok := timePoints[unixTime]; !ok {
			timePoints[unixTime] = &pb.CountriesTimePoint{
				Time:      unixTime,
				Countries: []*pb.CountryDataPoint{},
			}
		}

		timePoints[unixTime].Countries = append(timePoints[unixTime].Countries, &pb.CountryDataPoint{
			Name:  country,
			Value: int32(count),
		})
	}

	// Convert map to slice and sort by time
	var timePointsList []*pb.CountriesTimePoint
	for _, point := range timePoints {
		timePointsList = append(timePointsList, point)
	}
	sort.Slice(timePointsList, func(i, j int) bool {
		return timePointsList[i].Time < timePointsList[j].Time
	})

	// Store data
	key := filepath.Join("countries", networkName, window.File+".json")
	_, err = b.storageClient.StoreEncoded(b.getStoragePath(key), timePointsList, storage.CodecNameJSON)
	if err != nil {
		return fmt.Errorf("failed to store countries data for window %s: %w", window.File, err)
	}

	return nil
}

// processUsersWindow processes users data for a specific time window
func (b *XatuPublicContributors) processUsersWindow(networkName string, window TimeWindow) error {
	log := b.log.WithFields(logrus.Fields{
		"network":   networkName,
		"processor": UsersProcessorName,
		"window":    window.File,
	})
	log.Info("Processing users window")

	startTime, endTime := window.GetTimeRange(time.Now().UTC())
	stepDuration, err := window.GetStepDuration()
	if err != nil {
		return fmt.Errorf("failed to parse step duration: %w", err)
	}
	stepSeconds := int(stepDuration.Seconds())

	query := `
		WITH time_slots AS (
			SELECT
				toStartOfInterval(slot_start_date_time, INTERVAL $1 second) as time_slot,
				meta_client_name as user,
				meta_network_name,
				count(*) AS total -- Count occurrences, not distinct clients here
			FROM beacon_api_eth_v1_events_block FINAL
			WHERE
				slot_start_date_time BETWEEN $2 AND $3
				AND meta_client_name NOT LIKE 'ethpandaops%'
				AND meta_network_name = $4
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
		ORDER BY time_slot
	`

	rows, err := b.xatuClient.GetClickhouseClientForNetwork(networkName).Query(query, stepSeconds, startTime, endTime, networkName)
	if err != nil {
		return fmt.Errorf("failed to query clickhouse for users window: %w", err)
	}

	timePoints := make(map[int64]*pb.UsersTimePoint)

	for _, row := range rows {
		timestamp, ok := row["time"].(time.Time)
		if !ok {
			log.Warnf("Could not parse time from row: %v", row)
			continue
		}
		user, _ := row["user"].(string)
		// network, _ := row["meta_network_name"].(string) // Already known
		count, ok := row["total"].(int) // Assuming int
		if !ok {
			log.Warnf("Could not parse total count from row: %v", row)
			continue
		}

		unixTime := timestamp.Unix()

		if _, ok := timePoints[unixTime]; !ok {
			timePoints[unixTime] = &pb.UsersTimePoint{
				Time:  unixTime,
				Users: []*pb.UserDataPoint{},
			}
		}

		timePoints[unixTime].Users = append(timePoints[unixTime].Users, &pb.UserDataPoint{
			Name:  user,
			Value: int32(count),
		})
	}

	// Convert map to slice and sort by time
	var timePointsList []*pb.UsersTimePoint
	for _, point := range timePoints {
		timePointsList = append(timePointsList, point)
	}
	sort.Slice(timePointsList, func(i, j int) bool {
		return timePointsList[i].Time < timePointsList[j].Time
	})

	// Store data
	key := filepath.Join("users", networkName, window.File+".json")
	_, err = b.storageClient.StoreEncoded(b.getStoragePath(key), timePointsList, storage.CodecNameJSON)
	if err != nil {
		return fmt.Errorf("failed to store users data for window %s: %w", window.File, err)
	}

	return nil
}

// processUserSummaries processes user summaries
func (b *XatuPublicContributors) processUserSummaries(networkName string) error {
	log := b.log.WithFields(logrus.Fields{
		"network":   networkName,
		"processor": UserSummariesProcessorName,
	})
	log.Info("Processing user summaries")

	query := `
		SELECT
			meta_client_name as user,
			meta_network_name as network,
			meta_client_geo_country as country,
			meta_client_geo_continent_code as continent,
			meta_client_geo_city as city,
			meta_client_implementation as client, -- Changed from meta_consensus_implementation? Check original logic if needed
			min(slot_start_date_time) as first_seen,
			max(slot_start_date_time) as last_seen,
			count(*) as total_nodes -- Count occurrences
		FROM beacon_api_eth_v1_events_block FINAL
		WHERE
			meta_client_name NOT LIKE 'ethpandaops%'
			AND meta_network_name = $1
			AND meta_client_name != ''
			AND meta_client_name IS NOT NULL
		GROUP BY user, network, country, continent, city, client
	`

	rows, err := b.xatuClient.GetClickhouseClientForNetwork(networkName).Query(query, networkName)
	if err != nil {
		return fmt.Errorf("failed to query clickhouse for user summaries: %w", err)
	}

	// Group results by user first
	type userSummaryTemp struct {
		User       string
		Networks   map[string]int
		Countries  map[string]int
		Continents map[string]int
		Cities     map[string]int
		Clients    map[string]int
		FirstSeen  time.Time
		LastSeen   time.Time
		TotalNodes int
	}
	userSummaries := make(map[string]*userSummaryTemp)

	for _, row := range rows {
		user, _ := row["user"].(string)
		network, _ := row["network"].(string)
		country, _ := row["country"].(string)
		continent, _ := row["continent"].(string)
		city, _ := row["city"].(string)
		client, _ := row["client"].(string)
		firstSeen, okFS := row["first_seen"].(time.Time)
		lastSeen, okLS := row["last_seen"].(time.Time)
		totalNodes, okTN := row["total_nodes"].(int)

		if !okFS || !okLS || !okTN {
			log.Warnf("Could not parse data for user summary row: %v", row)
			continue
		}

		// Get or create user summary
		summary, ok := userSummaries[user]
		if !ok {
			summary = &userSummaryTemp{
				User:       user,
				Networks:   make(map[string]int),
				Countries:  make(map[string]int),
				Continents: make(map[string]int),
				Cities:     make(map[string]int),
				Clients:    make(map[string]int),
				FirstSeen:  firstSeen, // Initialize with first row's time
				LastSeen:   lastSeen,  // Initialize with first row's time
				TotalNodes: 0,
			}
			userSummaries[user] = summary
		}

		// Update first/last seen (min/max across all rows for the user)
		if firstSeen.Before(summary.FirstSeen) {
			summary.FirstSeen = firstSeen
		}
		if lastSeen.After(summary.LastSeen) {
			summary.LastSeen = lastSeen
		}

		// Update maps - add counts from this specific grouping
		summary.Networks[network] += totalNodes
		summary.Countries[country] += totalNodes
		summary.Continents[continent] += totalNodes
		summary.Cities[city] += totalNodes
		summary.Clients[client] += totalNodes

		// Update total
		summary.TotalNodes += totalNodes
	}

	// Store each user summary
	for user, summary := range userSummaries {
		// Convert to storage model
		storageSummary := &pb.UserSummary{
			User:       user,
			Networks:   convertToInt32Map(summary.Networks),
			Countries:  convertToInt32Map(summary.Countries),
			Continents: convertToInt32Map(summary.Continents),
			Cities:     convertToInt32Map(summary.Cities),
			Clients:    convertToInt32Map(summary.Clients),
			FirstSeen:  summary.FirstSeen.Unix(),
			LastSeen:   summary.LastSeen.Unix(),
			TotalNodes: int32(summary.TotalNodes),
		}

		// Store in S3
		key := filepath.Join("user_summaries", networkName, user+".json")
		_, err := b.storageClient.StoreEncoded(b.getStoragePath(key), storageSummary, storage.CodecNameJSON)
		if err != nil {
			// Log error but continue processing other users
			log.WithError(err).Errorf("Failed to store user summary for user %s", user)
		}
	}

	return nil
}

// --- Helper Functions ---

// getTimeRangeFromWindow is now a method on the config TimeWindow struct
// func getTimeRangeFromWindow(window TimeWindow) (time.Time, time.Time) { ... } // No longer needed here

// --- Proto Conversion (If needed, keep for reference or remove if models.go is sufficient) ---
// Convert internal TimeWindow to proto TimeWindow if necessary for API/other usage
func convertToProtoTimeWindow(tw *TimeWindow) *pb.TimeWindow {
	return &pb.TimeWindow{
		File:  tw.File,
		Step:  tw.Step,
		Label: tw.Label,
		Range: tw.Range,
	}
}

// Convert internal NodeCount to proto NodeCount
func convertToProtoNodeCount(nc *pb.NodeCount) *pb.NodeCount {
	return &pb.NodeCount{
		TotalNodes:  int32(nc.TotalNodes),
		PublicNodes: int32(nc.PublicNodes),
	}
}

// Convert internal NetworkStats to proto NetworkStats
func convertToProtoNetworkStats(ns *pb.NetworkStats) *pb.NetworkStats {
	protoNs := &pb.NetworkStats{
		TotalNodes:               int32(ns.TotalNodes),
		TotalPublicNodes:         int32(ns.TotalPublicNodes),
		Countries:                make(map[string]*pb.NodeCount),
		Continents:               make(map[string]*pb.NodeCount),
		Cities:                   make(map[string]*pb.NodeCount),
		ConsensusImplementations: make(map[string]*pb.NodeCount),
	}
	for k, v := range ns.Countries {
		protoNs.Countries[k] = convertToProtoNodeCount(v)
	}
	for k, v := range ns.Continents {
		protoNs.Continents[k] = convertToProtoNodeCount(v)
	}
	for k, v := range ns.Cities {
		protoNs.Cities[k] = convertToProtoNodeCount(v)
	}
	for k, v := range ns.ConsensusImplementations {
		protoNs.ConsensusImplementations[k] = convertToProtoNodeCount(v)
	}
	return protoNs
}

// Convert internal SummaryData to proto SummaryData
func convertToProtoSummaryData(sd *pb.SummaryData) *pb.SummaryData {
	protoSd := &pb.SummaryData{
		UpdatedAt: sd.UpdatedAt,
		Networks:  make(map[string]*pb.NetworkStats),
	}
	for k, v := range sd.Networks {
		protoSd.Networks[k] = convertToProtoNetworkStats(v)
	}
	return protoSd
}

// Convert internal CountryDataPoint to proto CountryDataPoint
func convertToProtoCountryDataPoint(cdp *pb.CountryDataPoint) *pb.CountryDataPoint {
	return &pb.CountryDataPoint{
		Name:  cdp.Name,
		Value: int32(cdp.Value),
	}
}

// Convert internal CountriesTimePoint to proto CountriesTimePoint
func convertToProtoCountriesTimePoint(ctp *pb.CountriesTimePoint) *pb.CountriesTimePoint {
	protoCtp := &pb.CountriesTimePoint{
		Time:      ctp.Time,
		Countries: make([]*pb.CountryDataPoint, len(ctp.Countries)),
	}
	for i, cdp := range ctp.Countries {
		protoCtp.Countries[i] = convertToProtoCountryDataPoint(cdp)
	}
	return protoCtp
}

// Convert internal UserDataPoint to proto UserDataPoint
func convertToProtoUserDataPoint(udp *pb.UserDataPoint) *pb.UserDataPoint {
	return &pb.UserDataPoint{
		Name:  udp.Name,
		Value: int32(udp.Value),
	}
}

// Convert internal UsersTimePoint to proto UsersTimePoint
func convertToProtoUsersTimePoint(utp *pb.UsersTimePoint) *pb.UsersTimePoint {
	protoUtp := &pb.UsersTimePoint{
		Time:  utp.Time,
		Users: make([]*pb.UserDataPoint, len(utp.Users)),
	}
	for i, udp := range utp.Users {
		protoUtp.Users[i] = convertToProtoUserDataPoint(udp)
	}
	return protoUtp
}

// Convert internal UserSummary to proto UserSummary
func convertToProtoUserSummary(us *pb.UserSummary) *pb.UserSummary {
	protoUs := &pb.UserSummary{
		User:       us.User,
		Networks:   make(map[string]int32),
		Countries:  make(map[string]int32),
		Continents: make(map[string]int32),
		Cities:     make(map[string]int32),
		Clients:    make(map[string]int32),
		FirstSeen:  us.FirstSeen,
		LastSeen:   us.LastSeen,
		TotalNodes: int32(us.TotalNodes),
	}
	for k, v := range us.Networks {
		protoUs.Networks[k] = int32(v)
	}
	for k, v := range us.Countries {
		protoUs.Countries[k] = int32(v)
	}
	for k, v := range us.Continents {
		protoUs.Continents[k] = int32(v)
	}
	for k, v := range us.Cities {
		protoUs.Cities[k] = int32(v)
	}
	for k, v := range us.Clients {
		protoUs.Clients[k] = int32(v)
	}
	return protoUs
}

// convertToInt32Map converts a map[string]int to map[string]int32
func convertToInt32Map(intMap map[string]int) map[string]int32 {
	result := make(map[string]int32, len(intMap))
	for k, v := range intMap {
		result[k] = int32(v)
	}
	return result
}
