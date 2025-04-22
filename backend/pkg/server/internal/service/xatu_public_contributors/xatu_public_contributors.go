package xatu_public_contributors

import (
	"context"
	"fmt"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/xatu"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"

	// Needed for state and config conversion
	pb_lab "github.com/ethpandaops/lab/backend/pkg/server/proto/lab"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_public_contributors"
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

	ethereumConfig   *ethereum.Config
	xatuClient       *xatu.Client
	storageClient    storage.Client
	cacheClient      cache.Client
	lockerClient     locker.Locker
	metrics          *metrics.Metrics
	metricsCollector *metrics.Collector

	// Metric collectors
	stateLastProcessedMetric       *prometheus.GaugeVec
	stateWindowLastProcessedMetric *prometheus.GaugeVec
	stateAgeMetric                 *prometheus.GaugeVec
	stateWindowAgeMetric           *prometheus.GaugeVec

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
	metricsSvc *metrics.Metrics,
) (*XatuPublicContributors, error) {
	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid xatu_public_contributors config: %w", err)
	}

	var metricsCollector *metrics.Collector
	if metricsSvc != nil {
		metricsCollector = metricsSvc.NewCollector(XatuPublicContributorsServiceName)
		log.WithField("component", "service/"+XatuPublicContributorsServiceName).Debug("Created metrics collector for xatu_public_contributors service")
	}

	return &XatuPublicContributors{
		log:              log.WithField("component", "service/"+XatuPublicContributorsServiceName),
		config:           config,
		ethereumConfig:   ethereumConfig,
		xatuClient:       xatuClient,
		storageClient:    storageClient,
		cacheClient:      cacheClient,
		lockerClient:     lockerClient,
		metrics:          metricsSvc,
		metricsCollector: metricsCollector,

		baseDir: XatuPublicContributorsServiceName,

		processCtx:       nil,
		processCtxCancel: nil,
	}, nil
}

func (b *XatuPublicContributors) BaseDirectory() string {
	return b.baseDir
}

func (b *XatuPublicContributors) Start(ctx context.Context) error {
	if b.config != nil && b.config.Enabled != nil && !*b.config.Enabled {
		b.log.Info("XatuPublicContributors service disabled")
		return nil
	}

	b.log.Info("Starting XatuPublicContributors service")

	// Initialize metrics
	b.initializeMetrics()

	leader := leader.New(b.log, b.lockerClient, leader.Config{
		Resource:        XatuPublicContributorsServiceName + "/batch_processing",
		TTL:             30 * time.Second,
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
	}, b.metrics)

	leader.Start()
	b.leaderClient = leader

	return nil
}

func (b *XatuPublicContributors) Stop() {
	b.log.Info("Stopping XatuPublicContributors service")
	if b.leaderClient != nil {
		b.leaderClient.Stop()
	}

	b.log.Info("Waiting for process loop to finish")
	if b.processCtxCancel != nil {
		b.processCtxCancel()
	}

	b.log.Info("Service stopped")
}

func (b *XatuPublicContributors) Name() string {
	return XatuPublicContributorsServiceName
}

func (b *XatuPublicContributors) processLoop() {
	ticker := time.NewTicker(time.Second * 15)
	defer ticker.Stop()

	// Initial processing run immediately if leader
	if b.leaderClient.IsLeader() {
		b.process(b.processCtx)
	}

	for {
		select {
		case <-b.processCtx.Done():
			b.log.Info("Context cancelled, stopping processing loop")
			return
		case <-ticker.C:
			if b.leaderClient.IsLeader() {
				b.process(b.processCtx)
			} else {
				b.log.Debug("Not leader, skipping processing cycle")
			}
		}
	}
}

// getStoragePath constructs the full storage path.
func (b *XatuPublicContributors) getStoragePath(key string) string {
	return filepath.Join(b.baseDir, key)
}

func (b *XatuPublicContributors) GetTimeWindows() []TimeWindow {
	return b.config.TimeWindows
}

func (b *XatuPublicContributors) FrontendModuleConfig() *pb_lab.FrontendConfig_XatuPublicContributorsModule {
	timeWindows := make([]*pb_lab.FrontendConfig_TimeWindow, 0, len(b.config.TimeWindows))
	for _, window := range b.config.TimeWindows {
		timeWindows = append(timeWindows, &pb_lab.FrontendConfig_TimeWindow{
			File:  window.File,
			Label: window.Label,
			Range: window.Range,
			Step:  window.Step,
		})
	}

	return &pb_lab.FrontendConfig_XatuPublicContributorsModule{
		Networks:    b.config.Networks,
		TimeWindows: timeWindows,
		PathPrefix:  b.baseDir,
		Enabled:     b.config.Enabled != nil && *b.config.Enabled,
	}
}

// loadState loads the state for a given network.
func (b *XatuPublicContributors) loadState(ctx context.Context, network string) (*State, error) {
	// Create a new state with initialized processors to ensure sane defaults
	state := &State{
		Processors: make(map[string]ProcessorState),
	}

	// Initialize default processor states
	state.GetProcessorState(SummaryProcessorName)       // Initializes an empty state for this processor
	state.GetProcessorState(CountriesProcessorName)     // Initializes an empty state for this processor
	state.GetProcessorState(UsersProcessorName)         // Initializes an empty state for this processor
	state.GetProcessorState(UserSummariesProcessorName) // Initializes an empty state for this processor

	// Try to load existing state
	key := GetStateKey(network)
	err := b.storageClient.GetEncoded(ctx, b.getStoragePath(key), state, storage.CodecNameJSON)
	if err != nil {
		// Check for any kind of "not found" error, not just the specific storage.ErrNotFound
		if err == storage.ErrNotFound || strings.Contains(err.Error(), "not found") {
			b.log.WithField("network", network).Info("No previous state found, using initialized default state.")
			return state, nil // Return initialized state if not found
		}
		// Only non-NotFound errors are returned as actual errors
		return nil, fmt.Errorf("failed to get state for network %s: %w", network, err)
	}

	// Ensure all required processors exist with properly initialized maps
	// For backwards compatibility with existing states
	for _, processorName := range []string{
		SummaryProcessorName,
		CountriesProcessorName,
		UsersProcessorName,
		UserSummariesProcessorName,
	} {
		procState := state.GetProcessorState(processorName)
		if procState.LastProcessedWindows == nil {
			procState.LastProcessedWindows = make(map[string]time.Time)
			state.UpdateProcessorState(processorName, procState)
		}
	}

	return state, nil
}

// saveState saves the state for a given network.
func (b *XatuPublicContributors) saveState(ctx context.Context, network string, state *State) error {
	key := GetStateKey(network)
	if err := b.storageClient.Store(ctx, storage.StoreParams{
		Key:         b.getStoragePath(key),
		Data:        state,
		Format:      storage.CodecNameJSON,
		Compression: storage.Gzip,
	}); err != nil {
		return fmt.Errorf("failed to store state for network %s: %w", network, err)
	}
	return nil
}

// shouldProcess checks if a processor should run based on the last run time and interval.
func (b *XatuPublicContributors) shouldProcess(processorName string, lastProcessed time.Time) bool {
	interval, err := b.config.GetInterval()
	if err != nil {
		b.log.WithError(err).Errorf("Failed to get interval for processor %s check", processorName)
		return false // Don't process if interval is invalid
	}
	if lastProcessed.IsZero() {
		return true // Never processed before
	}
	return time.Since(lastProcessed) > interval
}

// shouldProcessWindow checks if a specific window within a processor should run.
// Uses the internal TimeWindow struct from config.go
func (b *XatuPublicContributors) shouldProcessWindow(windowConfig TimeWindow, lastProcessedWindow time.Time) (bool, error) {
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
func (b *XatuPublicContributors) process(ctx context.Context) {
	b.log.Info("Starting processing cycle")
	startTime := time.Now()

	// Track processing cycle with metrics
	var processingCycleCounter *prometheus.CounterVec
	var processingErrorsCounter *prometheus.CounterVec
	var processingDurationHistogram *prometheus.HistogramVec

	var err error

	processingCycleCounter, err = b.metricsCollector.NewCounterVec(
		"processing_cycles_total",
		"Total number of processing cycles run",
		[]string{},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_cycles_total metric")
	}

	processingErrorsCounter, err = b.metricsCollector.NewCounterVec(
		"processing_errors_total",
		"Total number of processing errors",
		[]string{"network", "processor"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_errors_total metric")
	}

	processingDurationHistogram, err = b.metricsCollector.NewHistogramVec(
		"processing_duration_seconds",
		"Duration of processing operations in seconds",
		[]string{"network", "processor"},
		[]float64{0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_duration_seconds metric")
	}

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
		state, err := b.loadState(ctx, networkName)
		if err != nil {
			// This shouldn't happen for normal "not found" cases - loadState returns a default state for those
			// This indicates a more serious error like connectivity issues with storage
			log.WithError(err).Error("Failed to load state due to serious storage error, skipping network")

			// Record error in metrics
			if b.metricsCollector != nil && processingErrorsCounter != nil {
				processingErrorsCounter.WithLabelValues(
					networkName,
					"state_loading",
				).Inc()
			}

			continue
		}

		// Update state metrics
		b.updateStateMetrics(networkName, state)

		networkNeedsSave := false // Track if state needs saving for this network

		// --- Process Summary (Now handled globally after network loop) ---

		// --- Process Countries ---
		countriesProcessorState := state.GetProcessorState(CountriesProcessorName)
		// Check overall interval for the processor first
		if b.shouldProcess(CountriesProcessorName, countriesProcessorState.LastProcessed) {
			log.Info("Processing countries")
			processedAnyWindow := false
			for _, window := range b.config.TimeWindows {
				windowLog := log.WithField("window", window.File)
				// Get last processed time for this specific window file directly from map
				lastProcessedWindowTime := countriesProcessorState.LastProcessedWindows[window.File]
				should, err := b.shouldProcessWindow(window, lastProcessedWindowTime)
				if err != nil {
					windowLog.WithError(err).Error("Failed to check if should process countries window")
					continue
				}

				if should {
					windowLog.Info("Processing countries window")
					processorStartTime := time.Now()
					if err := b.processCountriesWindow(ctx, networkName, window); err != nil {
						windowLog.WithError(err).Error("Failed to process countries window")

						// Record error in metrics
						if b.metricsCollector != nil && processingErrorsCounter != nil {
							processingErrorsCounter.WithLabelValues(
								networkName,
								CountriesProcessorName,
							).Inc()
						}
					} else {
						// Record processing duration
						if b.metricsCollector != nil && processingDurationHistogram != nil {
							processingDurationHistogram.WithLabelValues(
								networkName,
								CountriesProcessorName,
							).Observe(time.Since(processorStartTime).Seconds())
						}
						// Update map directly
						countriesProcessorState.LastProcessedWindows[window.File] = time.Now().UTC()
						processedAnyWindow = true
						windowLog.Info("Successfully processed countries window")
					}
				} else {
					windowLog.Debug("Skipping countries window processing (step interval not met)")
				}
			}
			// Update main processor time only if any window was processed in this cycle
			if processedAnyWindow {
				countriesProcessorState.LastProcessed = time.Now().UTC()
				state.UpdateProcessorState(CountriesProcessorName, countriesProcessorState)
				networkNeedsSave = true
				log.Info("Finished processing countries windows")
			} else {
				log.Debug("No country windows needed processing in this cycle")
			}
		} else {
			log.Debug("Skipping countries processing (interval not met)")
		}

		// --- Process Users ---
		// Declare processorState within the correct scope for Users processor
		processorState := state.GetProcessorState(UsersProcessorName)
		if b.shouldProcess(UsersProcessorName, processorState.LastProcessed) {
			log.Info("Processing users")
			processedAnyWindow := false
			for _, window := range b.config.TimeWindows { // Use internal TimeWindow
				windowLog := log.WithField("window", window.File)
				// Get last processed time for this specific window file directly from map
				lastProcessedWindowTime := processorState.LastProcessedWindows[window.File]
				should, err := b.shouldProcessWindow(window, lastProcessedWindowTime) // Pass internal TimeWindow
				if err != nil {
					windowLog.WithError(err).Error("Failed to check if should process users window")
					continue
				}

				if should {
					windowLog.Info("Processing users window")
					processorStartTime := time.Now()
					if err := b.processUsersWindow(ctx, networkName, window); err != nil { // Pass internal TimeWindow
						windowLog.WithError(err).Error("Failed to process users window")

						// Record error in metrics
						if b.metricsCollector != nil && processingErrorsCounter != nil {
							processingErrorsCounter.WithLabelValues(
								networkName,
								UsersProcessorName,
							).Inc()
						}
					} else {
						// Record processing duration
						if b.metricsCollector != nil && processingDurationHistogram != nil {
							processingDurationHistogram.WithLabelValues(
								networkName,
								UsersProcessorName,
							).Observe(time.Since(processorStartTime).Seconds())
						}
						// Update map directly
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

		// Save state if changed
		if networkNeedsSave {
			if err := b.saveState(ctx, networkName, state); err != nil {
				log.WithError(err).Error("Failed to save state")
			} else {
				// Update state metrics after saving
				b.updateStateMetrics(networkName, state)
				log.Debug("Successfully saved state")
			}
		}
	}

	// --- Process Global Summaries (Summary, UserSummaries) ---
	globalStateKey := "global"
	globalState, err := b.loadState(ctx, globalStateKey)
	if err != nil {
		// This shouldn't happen for normal "not found" cases - loadState returns a default state for those
		// This indicates a more serious error like connectivity issues with storage
		b.log.WithError(err).Error("Failed to load global state due to serious storage error, skipping global processors")
	} else {
		// Update global state metrics
		b.updateStateMetrics(globalStateKey, globalState)

		globalNeedsSave := false

		// --- Process Summary (Global) ---
		summaryProcessorState := globalState.GetProcessorState(SummaryProcessorName)
		if b.shouldProcess(SummaryProcessorName, summaryProcessorState.LastProcessed) {
			b.log.Info("Processing summary (globally)")
			// Ensure all networks from config are passed
			networks := b.config.Networks
			if len(networks) == 0 {
				for _, net := range b.ethereumConfig.Networks {
					networks = append(networks, net.Name)
				}
			}
			processorStartTime := time.Now()
			if err := b.processSummary(ctx, networks); err != nil {
				b.log.WithError(err).Error("Failed to process summary")

				// Record error in metrics
				if b.metricsCollector != nil && processingErrorsCounter != nil {
					processingErrorsCounter.WithLabelValues(
						"global",
						SummaryProcessorName,
					).Inc()
				}
			} else {
				// Record processing duration
				if b.metricsCollector != nil && processingDurationHistogram != nil {
					processingDurationHistogram.WithLabelValues(
						"global",
						SummaryProcessorName,
					).Observe(time.Since(processorStartTime).Seconds())
				}
				summaryProcessorState.LastProcessed = time.Now().UTC()
				globalState.UpdateProcessorState(SummaryProcessorName, summaryProcessorState)
				globalNeedsSave = true
				b.log.Info("Successfully processed summary")
			}
		} else {
			b.log.Debug("Skipping summary processing (interval not met)")
		}

		// --- Process User Summaries (Global) ---
		userSummariesProcessorState := globalState.GetProcessorState(UserSummariesProcessorName)
		if b.shouldProcess(UserSummariesProcessorName, userSummariesProcessorState.LastProcessed) {
			b.log.Info("Processing user summaries (globally)")
			// Ensure all networks from config are passed
			networks := b.config.Networks
			if len(networks) == 0 {
				for _, net := range b.ethereumConfig.Networks {
					networks = append(networks, net.Name)
				}
			}
			processorStartTime := time.Now()
			if err := b.processUserSummaries(ctx, networks); err != nil {
				b.log.WithError(err).Error("Failed to process user summaries")

				// Record error in metrics
				if b.metricsCollector != nil && processingErrorsCounter != nil {
					processingErrorsCounter.WithLabelValues(
						"global",
						UserSummariesProcessorName,
					).Inc()
				}
			} else {
				// Record processing duration
				if b.metricsCollector != nil && processingDurationHistogram != nil {
					processingDurationHistogram.WithLabelValues(
						"global",
						UserSummariesProcessorName,
					).Observe(time.Since(processorStartTime).Seconds())
				}
				userSummariesProcessorState.LastProcessed = time.Now().UTC()
				globalState.UpdateProcessorState(UserSummariesProcessorName, userSummariesProcessorState)
				globalNeedsSave = true
				b.log.Info("Successfully processed user summaries")
			}
		} else {
			b.log.Debug("Skipping user summaries processing (interval not met)")
		}

		// Save global state if changed
		if globalNeedsSave {
			if err := b.saveState(ctx, globalStateKey, globalState); err != nil {
				b.log.WithError(err).Error("Failed to save global state")
				// Continue with processing, don't return
			} else {
				// Update state metrics after saving
				b.updateStateMetrics(globalStateKey, globalState)
				b.log.Debug("Successfully saved global state")
			}
		}
	}

	// Increment the processing cycle counter
	if b.metricsCollector != nil && processingCycleCounter != nil {
		processingCycleCounter.WithLabelValues().Inc()
	}

	// Record overall processing duration
	totalDuration := time.Since(startTime)
	b.log.WithField("duration", totalDuration).Info("Finished processing cycle")

	if b.metricsCollector != nil && processingDurationHistogram != nil {
		processingDurationHistogram.WithLabelValues(
			"all",
			"full_cycle",
		).Observe(totalDuration.Seconds())
	}
}

// initializeMetrics creates and registers all metrics for the xatu_public_contributors service
func (b *XatuPublicContributors) initializeMetrics() {
	if b.metricsCollector == nil {
		return
	}

	var err error

	// Processing cycles counter
	_, err = b.metricsCollector.NewCounterVec(
		"processing_cycles_total",
		"Total number of processing cycles run",
		[]string{},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_cycles_total metric")
	}

	// Processing errors counter
	_, err = b.metricsCollector.NewCounterVec(
		"processing_errors_total",
		"Total number of processing errors",
		[]string{"network", "processor"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_errors_total metric")
	}

	// Processing duration histogram
	_, err = b.metricsCollector.NewHistogramVec(
		"processing_duration_seconds",
		"Duration of processing operations in seconds",
		[]string{"network", "processor"},
		[]float64{0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_duration_seconds metric")
	}

	// Contributors count gauge
	_, err = b.metricsCollector.NewGaugeVec(
		"contributors_count",
		"Current count of contributors",
		[]string{"network", "type"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create contributors_count metric")
	}

	// State last processed time gauge
	b.stateLastProcessedMetric, err = b.metricsCollector.NewGaugeVec(
		"state_last_processed_seconds",
		"Last processed time for processors in seconds since epoch",
		[]string{"network", "processor"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create state_last_processed_seconds metric")
	}

	// State window last processed time gauge
	b.stateWindowLastProcessedMetric, err = b.metricsCollector.NewGaugeVec(
		"state_window_last_processed_seconds",
		"Last processed time for time windows in seconds since epoch",
		[]string{"network", "processor", "window"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create state_window_last_processed_seconds metric")
	}

	// State age gauge (time since last processed)
	b.stateAgeMetric, err = b.metricsCollector.NewGaugeVec(
		"state_age_seconds",
		"Age of processor state in seconds",
		[]string{"network", "processor"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create state_age_seconds metric")
	}

	// State window age gauge (time since window was last processed)
	b.stateWindowAgeMetric, err = b.metricsCollector.NewGaugeVec(
		"state_window_age_seconds",
		"Age of time window state in seconds",
		[]string{"network", "processor", "window"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create state_window_age_seconds metric")
	}
}

// processSummary generates the global summary file.
func (b *XatuPublicContributors) processSummary(ctx context.Context, networks []string) error {
	log := b.log.WithFields(logrus.Fields{
		"processor": SummaryProcessorName,
		"networks":  networks,
	})
	log.Info("Processing global summary")
	now := time.Now().UTC()
	startTime := now.Add(-1 * time.Hour) // Summary is always for the last hour

	// Initialize result structure using protobuf types
	summary := &pb.SummaryData{
		UpdatedAt: now.Unix(),
		Networks:  make(map[string]*pb.NetworkStats),
	}

	// Query to get counts per dimension for the last hour
	// We need to run this per network as ClickHouse client is per-network
	query := `
		SELECT
			meta_network_name,
			meta_client_geo_country AS country,
			meta_client_geo_continent_code AS continent,
			meta_client_geo_city AS city,
			meta_consensus_implementation AS consensus_impl,
			count(DISTINCT meta_client_name) AS total_count,
			countIf(DISTINCT meta_client_name, meta_client_name NOT LIKE 'ethpandaops%') AS public_count
		FROM beacon_api_eth_v1_events_block FINAL
		WHERE
			slot_start_date_time BETWEEN ? AND ?
			AND meta_network_name = ?
			AND meta_client_name != '' AND meta_client_name IS NOT NULL
		GROUP BY
			meta_network_name, country, continent, city, consensus_impl
	`

	for _, networkName := range networks {
		networkLog := log.WithField("query_network", networkName)
		ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
		if err != nil {
			networkLog.WithError(err).Warnf("Clickhouse client not available for network, skipping summary contribution")
			continue
		}

		networkLog.Debug("Querying network for summary data")
		rows, err := ch.Query(ctx, query, startTime, now, networkName)
		if err != nil {
			networkLog.WithError(err).Errorf("Failed to query clickhouse for summary data")
			continue // Skip this network's contribution on error
		}
		networkLog.Debugf("Got %d aggregation rows from network", len(rows))

		// Initialize network-specific stats
		networkStats := &pb.NetworkStats{
			Network:                  networkName,
			TotalNodes:               0,
			TotalPublicNodes:         0,
			Countries:                make(map[string]*pb.NodeCountStats),
			Continents:               make(map[string]*pb.NodeCountStats),
			Cities:                   make(map[string]*pb.NodeCountStats),
			ConsensusImplementations: make(map[string]*pb.NodeCountStats),
		}

		// Process rows for this network
		for _, row := range rows {
			country, _ := row["country"].(string)
			continent, _ := row["continent"].(string)
			city, _ := row["city"].(string)
			consensusImpl, _ := row["consensus_impl"].(string)
			totalCount, okT := row["total_count"].(uint64)   // count() returns UInt64
			publicCount, okP := row["public_count"].(uint64) // countIf() returns UInt64

			if !okT || !okP {
				networkLog.Warnf("Could not parse counts from row: %v", row)
				continue
			}

			// Aggregate totals for the network
			networkStats.TotalNodes += int32(totalCount)
			networkStats.TotalPublicNodes += int32(publicCount)

			// Aggregate by dimension for the network
			if country != "" {
				if _, exists := networkStats.Countries[country]; !exists {
					networkStats.Countries[country] = &pb.NodeCountStats{
						TotalNodes:  0,
						PublicNodes: 0,
					}
				}
				current := networkStats.Countries[country]
				current.TotalNodes += int32(totalCount)
				current.PublicNodes += int32(publicCount)
			}

			if continent != "" {
				if _, exists := networkStats.Continents[continent]; !exists {
					networkStats.Continents[continent] = &pb.NodeCountStats{
						TotalNodes:  0,
						PublicNodes: 0,
					}
				}
				current := networkStats.Continents[continent]
				current.TotalNodes += int32(totalCount)
				current.PublicNodes += int32(publicCount)
			}

			if city != "" {
				if _, exists := networkStats.Cities[city]; !exists {
					networkStats.Cities[city] = &pb.NodeCountStats{
						TotalNodes:  0,
						PublicNodes: 0,
					}
				}
				current := networkStats.Cities[city]
				current.TotalNodes += int32(totalCount)
				current.PublicNodes += int32(publicCount)
			}

			if consensusImpl != "" {
				if _, exists := networkStats.ConsensusImplementations[consensusImpl]; !exists {
					networkStats.ConsensusImplementations[consensusImpl] = &pb.NodeCountStats{
						TotalNodes:  0,
						PublicNodes: 0,
					}
				}
				current := networkStats.ConsensusImplementations[consensusImpl]
				current.TotalNodes += int32(totalCount)
				current.PublicNodes += int32(publicCount)
			}
		}

		// Add network summary to global summary
		summary.Networks[networkName] = networkStats
	}

	// Store the summary
	key := "summary"
	if err := b.storageClient.Store(ctx, storage.StoreParams{
		Key:         b.getStoragePath(key),
		Data:        summary,
		Format:      storage.CodecNameJSON,
		Compression: storage.Gzip,
	}); err != nil {
		return fmt.Errorf("failed to store summary data: %w", err)
	}

	log.Info("Successfully processed and stored summary")
	return nil
}

// processCountriesWindow generates the time-series country data for a specific network and window.
func (b *XatuPublicContributors) processCountriesWindow(ctx context.Context, networkName string, window TimeWindow) error {
	log := b.log.WithFields(logrus.Fields{
		"network":   networkName,
		"processor": CountriesProcessorName,
		"window":    window.File,
	})
	log.Info("Processing countries window")

	startTime, endTime, err := window.GetTimeRange(time.Now().UTC())
	if err != nil {
		return fmt.Errorf("failed to get time range for window %s: %w", window.File, err)
	}
	stepDuration, err := window.GetStepDuration()
	if err != nil {
		return fmt.Errorf("failed to parse step duration for window %s: %w", window.File, err)
	}
	stepSeconds := int(stepDuration.Seconds())

	// Query to get public node count per country over time intervals
	query := `
		SELECT
			toStartOfInterval(slot_start_date_time, INTERVAL ? second) as time_slot,
			meta_client_geo_country AS country,
			count(distinct meta_client_name) AS public_node_count
		FROM beacon_api_eth_v1_events_block FINAL
		WHERE
			slot_start_date_time BETWEEN ? AND ?
			AND meta_network_name = ?
			AND meta_client_name NOT LIKE 'ethpandaops%' -- Only public nodes
			AND meta_client_name != '' AND meta_client_name IS NOT NULL
			AND country != '' AND country IS NOT NULL
		GROUP BY time_slot, country
		ORDER BY time_slot
	`

	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	rows, err := ch.Query(ctx, query, stepSeconds, startTime, endTime, networkName)
	if err != nil {
		return fmt.Errorf("failed to query clickhouse for countries window: %w", err)
	}

	// Process results: group by time_slot
	// Map timestamp to data point
	timePointsMap := make(map[int64]*pb.CountryDataPoint)

	for _, row := range rows {
		timestamp, okT := row["time_slot"].(time.Time)
		country, okC := row["country"].(string)
		nodeCount, okN := row["public_node_count"].(uint64) // count(distinct) returns UInt64

		if !okT || !okC || !okN || country == "" {
			log.Warnf("Could not parse row or invalid data for countries window: %v", row)
			continue
		}

		unixTime := timestamp.Unix()

		// Get or create data point for this timestamp
		dataPoint, exists := timePointsMap[unixTime]
		if !exists {
			// Create new timestamp using protobuf timestamp
			dataPoint = &pb.CountryDataPoint{
				Time:      timestamp.Unix(),
				Countries: []*pb.CountryCount{},
			}
			timePointsMap[unixTime] = dataPoint
		}

		// Add country count to data point
		dataPoint.Countries = append(dataPoint.Countries, &pb.CountryCount{
			Name:  country,
			Value: int32(nodeCount),
		})
	}

	// Convert map to sorted array
	var dataPoints []*pb.CountryDataPoint
	for _, dataPoint := range timePointsMap {
		dataPoints = append(dataPoints, dataPoint)
	}

	// Sort by timestamp
	sort.Slice(dataPoints, func(i, j int) bool {
		return dataPoints[i].Time < dataPoints[j].Time
	})

	// Convert short file name to long format for storage
	fileName := window.File

	key := filepath.Join("countries", networkName, fileName)
	if err := b.storageClient.Store(ctx, storage.StoreParams{
		Key:         b.getStoragePath(key),
		Data:        dataPoints,
		Format:      storage.CodecNameJSON,
		Compression: storage.Gzip,
	}); err != nil {
		return fmt.Errorf("failed to store countries window data: %w", err)
	}

	log.Info("Successfully processed and stored countries window")
	return nil
}

// processUsersWindow processes users data for a specific time window
func (b *XatuPublicContributors) processUsersWindow(ctx context.Context, networkName string, window TimeWindow) error {
	log := b.log.WithFields(logrus.Fields{
		"network":   networkName,
		"processor": UsersProcessorName,
		"window":    window.File,
	})
	log.Info("Processing users window")

	startTime, endTime, err := window.GetTimeRange(time.Now().UTC()) // Handle error
	if err != nil {
		return fmt.Errorf("failed to get time range for window %s: %w", window.File, err)
	}
	stepDuration, err := window.GetStepDuration()
	if err != nil {
		return fmt.Errorf("failed to parse step duration: %w", err)
	}
	stepSeconds := int(stepDuration.Seconds())

	// Query updated to match Python logic: extract username and count distinct nodes
	query := `
		WITH time_slots AS (
			SELECT
				toStartOfInterval(slot_start_date_time, INTERVAL ? second) as time_slot,
				extractAll(meta_client_name, '/([^/]+)/[^/]+$')[1] as username,
				meta_network_name,
				count(distinct meta_client_name) AS node_count
			FROM beacon_api_eth_v1_events_block FINAL
			WHERE
				slot_start_date_time BETWEEN ? AND ?
				AND meta_client_name NOT LIKE 'ethpandaops%'
				AND meta_network_name = ?
				AND meta_client_name != ''
				AND meta_client_name IS NOT NULL
			GROUP BY time_slot, username, meta_network_name
		)
		SELECT
			time_slot as time,
			username,
			meta_network_name,
			node_count
		FROM time_slots
		ORDER BY time_slot
	`

	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	rows, err := ch.Query(ctx, query, stepSeconds, startTime, endTime, networkName)
	if err != nil {
		return fmt.Errorf("failed to query clickhouse for users window: %w", err)
	}

	// Process results similar to Python: group by time, then aggregate users
	timePoints := make(map[int64]*pb.UsersTimePoint)

	for _, row := range rows {
		timestamp, ok := row["time"].(time.Time)
		if !ok {
			log.Warnf("Could not parse time from row: %v", row)
			continue
		}
		username, _ := row["username"].(string)
		// network, _ := row["meta_network_name"].(string) // Already known (networkName)
		nodeCount, ok := row["node_count"].(uint64) // Assuming int
		if !ok {
			log.Warnf("Could not parse node_count from row: %v", row)
			continue
		}

		// Skip empty usernames potentially returned by extractAll if regex fails
		if username == "" {
			log.Debugf("Skipping row with empty username: %v", row)
			continue
		}

		unixTime := timestamp.Unix()

		if _, ok := timePoints[unixTime]; !ok {
			timePoints[unixTime] = &pb.UsersTimePoint{
				Time:  unixTime,
				Users: []*pb.UserDataPoint{},
			}
		}

		// Append user data point for this timestamp
		timePoints[unixTime].Users = append(timePoints[unixTime].Users, &pb.UserDataPoint{
			Name:  username,
			Nodes: int32(nodeCount), // Use Nodes field as per proto
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

	// Convert short file name to long format for storage
	fileName := window.File

	key := filepath.Join("users", networkName, fileName)
	if err := b.storageClient.Store(ctx, storage.StoreParams{
		Key:         b.getStoragePath(key),
		Data:        timePointsList,
		Format:      storage.CodecNameJSON,
		Compression: storage.Gzip,
	}); err != nil {
		return fmt.Errorf("failed to store users data for window %s: %w", window.File, err)
	}

	return nil
}

// processUserSummaries processes user summaries globally across specified networks.
// Updated signature to accept []string
func (b *XatuPublicContributors) processUserSummaries(ctx context.Context, networks []string) error {
	log := b.log.WithFields(logrus.Fields{
		"processor": UserSummariesProcessorName,
		"networks":  networks,
	})
	log.Info("Processing user summaries globally")

	// Query updated to match Python logic: latest event per client in last 24h, username extraction
	query := `
		WITH latest_events AS (
			SELECT
				meta_client_name,
				meta_network_name,
				meta_client_implementation,
				meta_client_version,
				meta_consensus_implementation,
				meta_consensus_version,
				meta_client_geo_country,
				meta_client_geo_city,
				meta_client_geo_continent_code,
				slot,
				slot_start_date_time,
				ROW_NUMBER() OVER (PARTITION BY meta_client_name ORDER BY slot_start_date_time DESC) as rn
			FROM beacon_api_eth_v1_events_block FINAL
			WHERE
				slot_start_date_time >= now() - INTERVAL 24 HOUR
				AND meta_network_name = ?
				AND meta_client_name != ''
				AND meta_client_name IS NOT NULL
		)
		SELECT
			meta_client_name, // Fetch full name, process in Go
			meta_network_name,
			meta_consensus_implementation as consensus_client,
			meta_consensus_version as consensus_version,
			meta_client_geo_country as country,
			meta_client_geo_city as city,
			meta_client_geo_continent_code as continent,
			slot as latest_slot,
			slot_start_date_time as latest_slot_start_date_time,
			meta_client_implementation as client_implementation,
			meta_client_version as client_version
		FROM latest_events
		WHERE rn = 1
	`
	// We need to query each network individually and aggregate results,
	// as there's no single client to query across multiple networks directly.
	allRows := []map[string]interface{}{}

	for _, networkName := range networks {
		networkLog := log.WithField("query_network", networkName)
		clickhouseClient, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
		if err != nil {
			networkLog.WithError(err).Warnf("Clickhouse client not available for network, skipping")
			continue
		}

		// Extra verification of the client
		if clickhouseClient == nil {
			networkLog.Errorf("GetClickhouseClientForNetwork returned nil client without error for network %s", networkName)
			continue
		}

		networkLog.Debug("Querying network for user summary data")
		// Pass the single network name to the query placeholder
		rows, err := clickhouseClient.Query(ctx, query, networkName)
		if err != nil {
			// Log error but continue with other networks
			networkLog.WithError(err).Errorf("Failed to query clickhouse for user summaries")
			continue
		}
		networkLog.Debugf("Got %d rows from network", len(rows))
		allRows = append(allRows, rows...)
	}

	log.Infof("Total rows fetched across all networks: %d", len(allRows))

	// Group results by username
	usersByName := make(map[string]*pb.UserSummary)
	now := time.Now().UTC()
	nowUnix := now.Unix()

	// Now process the aggregated rows
	for _, row := range allRows {
		metaClientName, _ := row["meta_client_name"].(string)
		network, _ := row["meta_network_name"].(string)
		consensusClient, _ := row["consensus_client"].(string)
		consensusVersion, _ := row["consensus_version"].(string)
		country, _ := row["country"].(string)
		city, _ := row["city"].(string)
		continent, _ := row["continent"].(string)
		latestSlot, okSlot := row["latest_slot"].(uint32)
		latestSlotTime, okTime := row["latest_slot_start_date_time"].(time.Time)
		clientImpl, _ := row["client_implementation"].(string)
		clientVersion, _ := row["client_version"].(string)

		if !okSlot || !okTime {
			log.Warnf("Could not parse slot or time for user summary row: %v", row)
			continue
		}

		// Extract username using the utility function
		username := ExtractUsername(metaClientName)
		if username == "" {
			log.Debugf("Skipping row with empty extracted username for meta_client_name: %s", metaClientName)

			continue
		}

		// Get or create user summary entry using the new proto structure
		userSummary, ok := usersByName[username]
		if !ok {
			userSummary = &pb.UserSummary{
				Name:      username,
				Nodes:     []*pb.NodeDetail{},
				UpdatedAt: nowUnix,
			}
			usersByName[username] = userSummary
		}

		// Append node details using the new proto structure
		userSummary.Nodes = append(userSummary.Nodes, &pb.NodeDetail{
			Network:                 network,
			ClientName:              metaClientName,
			ConsensusClient:         consensusClient,
			ConsensusVersion:        consensusVersion,
			Country:                 country,
			City:                    city,
			Continent:               continent,
			LatestSlot:              int64(latestSlot),
			LatestSlotStartDateTime: latestSlotTime.Unix(),
			ClientImplementation:    clientImpl,
			ClientVersion:           clientVersion,
		})
	}

	// Prepare global summary using the new proto structure
	globalSummary := &pb.GlobalUserSummary{
		Contributors: []*pb.UserSummary{},
		UpdatedAt:    nowUnix,
	}

	// Store individual user summaries and build global summary
	storageBaseDir := b.getStoragePath("user-summaries") // Global base directory like Python
	for username, userSummaryData := range usersByName {
		// Set the node_count field to the number of nodes
		userSummaryData.NodeCount = int32(len(userSummaryData.Nodes))

		// Store individual user file
		userKey := filepath.Join(storageBaseDir, "users", username)
		// Use StoreEncoded directly, assuming storage client handles base pathing if needed, or adjust key.
		// Using getStoragePath might prepend the service name, which we don't want here.
		if err := b.storageClient.Store(ctx, storage.StoreParams{
			Key:         userKey,
			Data:        userSummaryData,
			Format:      storage.CodecNameJSON,
			Compression: storage.Gzip,
		}); err != nil {
			log.WithError(err).Errorf("Failed to store user summary for user %s", username)
			// Continue processing other users
		}

		// Add to global summary list
		globalSummary.Contributors = append(globalSummary.Contributors, userSummaryData)
	}

	// Sort global summary contributors by name for consistency
	sort.Slice(globalSummary.Contributors, func(i, j int) bool {
		return globalSummary.Contributors[i].Name < globalSummary.Contributors[j].Name
	})

	// Store global summary file
	summaryKey := b.getStoragePath("user-summaries/summary")

	if err := b.storageClient.Store(ctx, storage.StoreParams{
		Key:         summaryKey,
		Data:        globalSummary,
		Format:      storage.CodecNameJSON,
		Compression: storage.Gzip,
	}); err != nil {
		return fmt.Errorf("failed to store global user summary: %w", err)
	}

	log.Infof("Wrote summary data for %d users", len(usersByName))
	return nil
}

// ReadSummaryData reads the global summary data from storage.
func (b *XatuPublicContributors) ReadSummaryData(ctx context.Context) (*pb.SummaryData, error) {
	log := b.log.WithField("method", "ReadSummaryData")
	key := "summary" // Global summary file
	storagePath := b.getStoragePath(key)
	summary := &pb.SummaryData{}

	log.WithField("path", storagePath).Debug("Attempting to read summary data")
	err := b.storageClient.GetEncoded(ctx, storagePath, summary, storage.CodecNameJSON)
	if err != nil {
		if err == storage.ErrNotFound {
			log.Warn("Summary data not found in storage")
			return nil, storage.ErrNotFound // Return specific error for gRPC mapping
		}
		log.WithError(err).Error("Failed to get summary data from storage")
		return nil, fmt.Errorf("failed to get summary data: %w", err)
	}
	log.Debug("Successfully read summary data")
	return summary, nil
}

// ReadCountryDataWindow reads the time-series country data for a specific network and window file from storage.
func (b *XatuPublicContributors) ReadCountryDataWindow(ctx context.Context, networkName string, windowFile string) ([]*pb.CountryDataPoint, error) {
	log := b.log.WithFields(logrus.Fields{
		"method":  "ReadCountryDataWindow",
		"network": networkName,
		"window":  windowFile,
	})
	// Construct path: countries/<network>/<windowFile>
	key := filepath.Join("countries", networkName, windowFile+"")
	storagePath := b.getStoragePath(key)
	var dataPoints []*pb.CountryDataPoint

	log.WithField("path", storagePath).Debug("Attempting to read country data window")
	err := b.storageClient.GetEncoded(ctx, storagePath, &dataPoints, storage.CodecNameJSON)
	if err != nil {
		if err == storage.ErrNotFound {
			log.Warn("Country data window not found in storage")
			return nil, storage.ErrNotFound // Return specific error
		}
		log.WithError(err).Error("Failed to get country data window from storage")
		return nil, fmt.Errorf("failed to get country data for window %s: %w", windowFile, err)
	}
	log.Debugf("Successfully read %d country data points", len(dataPoints))
	return dataPoints, nil
}

// ReadUsersDataWindow reads the time-series user data for a specific network and window file from storage.
// Note: The stored data is already in the []*pb.UsersTimePoint format.
func (b *XatuPublicContributors) ReadUsersDataWindow(ctx context.Context, networkName string, windowFile string) ([]*pb.UsersTimePoint, error) {
	log := b.log.WithFields(logrus.Fields{
		"method":  "ReadUsersDataWindow",
		"network": networkName,
		"window":  windowFile,
	})
	// Construct path: users/<network>/<windowFile>
	key := filepath.Join("users", networkName, windowFile+"")
	storagePath := b.getStoragePath(key)
	var dataPoints []*pb.UsersTimePoint // Directly use the proto type as stored

	log.WithField("path", storagePath).Debug("Attempting to read users data window")
	err := b.storageClient.GetEncoded(ctx, storagePath, &dataPoints, storage.CodecNameJSON)
	if err != nil {
		if err == storage.ErrNotFound {
			log.Warn("Users data window not found in storage")
			return nil, storage.ErrNotFound // Return specific error
		}
		log.WithError(err).Error("Failed to get users data window from storage")
		return nil, fmt.Errorf("failed to get users data for window %s: %w", windowFile, err)
	}
	log.Debugf("Successfully read %d users time points", len(dataPoints))
	return dataPoints, nil
}

// ReadUserSummary reads the summary data for a specific user from storage.
// Note: The stored data is already in the *pb.UserSummary format.
// Note: Uses a different base path "user-summaries/".
func (b *XatuPublicContributors) ReadUserSummary(ctx context.Context, username string) (*pb.UserSummary, error) {
	log := b.log.WithFields(logrus.Fields{
		"method":   "ReadUserSummary",
		"username": username,
	})
	// Construct path: user-summaries/users/<username>
	// IMPORTANT: This uses a different base directory than getStoragePath typically uses.
	// We construct the path relative to the storage root directly.
	storagePath := filepath.Join("user-summaries", "users", username+"")
	userSummary := &pb.UserSummary{} // Directly use the proto type as stored

	log.WithField("path", storagePath).Debug("Attempting to read user summary")
	err := b.storageClient.GetEncoded(ctx, storagePath, userSummary, storage.CodecNameJSON)
	if err != nil {
		if err == storage.ErrNotFound {
			log.Warn("User summary not found in storage")
			return nil, storage.ErrNotFound // Return specific error
		}
		log.WithError(err).Error("Failed to get user summary from storage")
		return nil, fmt.Errorf("failed to get user summary for %s: %w", username, err)
	}

	// Ensure the node_count field is set
	if userSummary.NodeCount == 0 && len(userSummary.Nodes) > 0 {
		userSummary.NodeCount = int32(len(userSummary.Nodes))
		log.Debug("Updated node_count field that was missing")
	}

	log.Debug("Successfully read user summary")
	return userSummary, nil
}

// updateStateMetrics updates metrics related to state information
func (b *XatuPublicContributors) updateStateMetrics(network string, state *State) {
	if b.metricsCollector == nil {
		return
	}

	// Check if metrics are initialized
	if b.stateLastProcessedMetric == nil || b.stateWindowLastProcessedMetric == nil ||
		b.stateAgeMetric == nil || b.stateWindowAgeMetric == nil {
		b.log.Debug("State metrics not initialized, skipping metrics update")
		return
	}

	now := time.Now()

	// Update metrics for each processor
	for processorName, processorState := range state.Processors {
		// Skip processors with zero time (never processed)
		if !processorState.LastProcessed.IsZero() {
			// Last processed time in seconds since epoch
			b.stateLastProcessedMetric.WithLabelValues(network, processorName).Set(float64(processorState.LastProcessed.Unix()))

			// Age in seconds
			ageSeconds := now.Sub(processorState.LastProcessed).Seconds()
			b.stateAgeMetric.WithLabelValues(network, processorName).Set(ageSeconds)
		}

		// Update window-specific metrics
		for windowName, windowTime := range processorState.LastProcessedWindows {
			if !windowTime.IsZero() {
				// Last processed window time in seconds since epoch
				b.stateWindowLastProcessedMetric.WithLabelValues(network, processorName, windowName).Set(float64(windowTime.Unix()))

				// Window age in seconds
				windowAgeSeconds := now.Sub(windowTime).Seconds()
				b.stateWindowAgeMetric.WithLabelValues(network, processorName, windowName).Set(windowAgeSeconds)
			}
		}
	}
}
