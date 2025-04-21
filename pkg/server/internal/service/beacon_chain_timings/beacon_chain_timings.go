package beacon_chain_timings

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/pkg/internal/lab/state"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_chain_timings"
	pb_lab "github.com/ethpandaops/lab/pkg/server/proto/lab"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	BeaconChainTimingsServiceName = "beacon_chain_timings"
)

// TimeWindowConfig represents configuration for a time window
type TimeWindowConfig struct {
	File    string
	Label   string
	RangeMs int64
}

func GetStoragePath(key string) string {
	return fmt.Sprintf("%s/%s", BeaconChainTimingsServiceName, key)
}

type BeaconChainTimings struct {
	log logrus.FieldLogger

	config *Config

	ethereumConfig   *ethereum.Config
	xatuClient       *xatu.Client
	storageClient    storage.Client
	cacheClient      cache.Client
	lockerClient     locker.Locker
	stateClient      state.Client[*pb.State]
	metrics          *metrics.Metrics
	metricsCollector *metrics.Collector

	// Metric collectors
	stateLastProcessedMetric *prometheus.GaugeVec
	stateAgeMetric           *prometheus.GaugeVec

	leaderClient leader.Client

	processCtx       context.Context
	processCtxCancel context.CancelFunc
	parentCtx        context.Context

	// Base directory for storage
	baseDir string
}

// New creates a new BeaconChainTimings service
func New(
	log logrus.FieldLogger,
	config *Config,
	xatuClient *xatu.Client,
	ethereumConfig *ethereum.Config,
	storageClient storage.Client,
	cacheClient cache.Client,
	lockerClient locker.Locker,
	metricsSvc *metrics.Metrics,
) (*BeaconChainTimings, error) {
	serviceLog := log.WithField("component", "service/beacon_chain_timings")

	var metricsCollector *metrics.Collector
	if metricsSvc != nil {
		metricsCollector = metricsSvc.NewCollector("beacon_chain_timings")
		serviceLog.Debug("Created metrics collector for beacon_chain_timings service")
	}

	return &BeaconChainTimings{
		log:              serviceLog,
		config:           config,
		ethereumConfig:   ethereumConfig,
		xatuClient:       xatuClient,
		storageClient:    storageClient,
		cacheClient:      cacheClient,
		lockerClient:     lockerClient,
		metrics:          metricsSvc,
		metricsCollector: metricsCollector,
		stateClient: state.New[*pb.State](log, cacheClient, &state.Config{
			Namespace: BeaconChainTimingsServiceName,
			TTL:       31 * 24 * time.Hour,
		}, "state", metricsSvc),

		baseDir: BeaconChainTimingsServiceName,

		processCtx:       nil,
		processCtxCancel: nil,
	}, nil
}

func (b *BeaconChainTimings) Start(ctx context.Context) error {
	if b.config != nil && b.config.Enabled != nil && !*b.config.Enabled {
		b.log.Info("BeaconChainTimings service is disabled, skipping")
		return nil
	}

	b.log.Info("Starting BeaconChainTimings service")
	b.parentCtx = ctx // Store the parent context

	// Initialize metrics if collector is available
	b.initializeMetrics()

	leader := leader.New(b.log, b.lockerClient, leader.Config{
		Resource:        BeaconChainTimingsServiceName + "/batch_processing",
		TTL:             30 * time.Second,
		RefreshInterval: 5 * time.Second,

		OnElected: func() {
			b.log.Info("Became leader")

			// Update leadership status metric if available
			b.updateLeadershipMetric(true)

			if b.processCtx != nil {
				// We are already processing, so we don't need to start a new one
				b.log.Info("Already processing, skipping")

				return
			}

			// Create a new context for the process, derived from the Start context
			processCtx, cancel := context.WithCancel(b.parentCtx)

			b.processCtx = processCtx
			b.processCtxCancel = cancel

			go b.processLoop()
		},
		OnRevoked: func() {
			b.log.Info("Lost leadership")

			// Update leadership status metric if available
			b.updateLeadershipMetric(false)

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

// initializeMetrics creates and registers all metrics for the beacon_chain_timings service
func (b *BeaconChainTimings) initializeMetrics() {
	if b.metricsCollector == nil {
		return
	}

	var err error

	// Processing duration metrics (histograms)
	_, err = b.metricsCollector.NewHistogramVec(
		"processing_duration_seconds",
		"Duration of processing operations in seconds",
		[]string{"operation", "network", "window"},
		[]float64{0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_duration_seconds metric")
	}

	// Error count metrics (counter)
	_, err = b.metricsCollector.NewCounterVec(
		"processing_errors_total",
		"Total number of processing errors",
		[]string{"operation", "network", "window"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_errors_total metric")
	}

	// Processing count metrics (counter)
	_, err = b.metricsCollector.NewCounterVec(
		"processing_operations_total",
		"Total number of processing operations",
		[]string{"operation", "network", "window"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_operations_total metric")
	}

	// Processing decisions metrics (counter)
	_, err = b.metricsCollector.NewCounterVec(
		"processing_decisions_total",
		"Total number of processing decisions",
		[]string{"decision", "reason", "network", "window"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create processing_decisions_total metric")
	}

	// State last processed time metrics (gauge)
	b.stateLastProcessedMetric, err = b.metricsCollector.NewGaugeVec(
		"state_last_processed_seconds",
		"Last processed time for data types in seconds since epoch",
		[]string{"network", "window", "data_type"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create state_last_processed_seconds metric")
	}

	// State age metrics (gauge)
	b.stateAgeMetric, err = b.metricsCollector.NewGaugeVec(
		"state_age_seconds",
		"Age of data type state in seconds",
		[]string{"network", "window", "data_type"},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to create state_age_seconds metric")
	}
}

// updateLeadershipMetric updates the leadership status metric
func (b *BeaconChainTimings) updateLeadershipMetric(isLeader bool) {
	leaderMetric, err := b.metricsCollector.NewGaugeVec(
		"is_leader",
		"Indicates whether this instance is currently the leader (1) or not (0)",
		[]string{},
	)
	if err != nil {
		b.log.WithError(err).Warn("Failed to get is_leader metric")
		return
	}

	value := 0.0
	if isLeader {
		value = 1.0
	}

	leaderMetric.WithLabelValues().Set(value)
}

func (b *BeaconChainTimings) Stop() {
	b.log.Info("Stopping BeaconChainTimings service")

	b.log.Info("Stopping leader client")
	if b.leaderClient != nil {
		b.leaderClient.Stop()
	}

	b.log.Info("Waiting for process loop to finish")
	if b.processCtxCancel != nil {
		b.processCtxCancel()
	}

	b.log.Info("BeaconChainTimings service stopped")
}

func (b *BeaconChainTimings) FrontendModuleConfig() *pb_lab.FrontendConfig_BeaconChainTimingsModule {
	networks := make([]string, 0, len(b.ethereumConfig.Networks))
	for network := range b.ethereumConfig.Networks {
		networks = append(networks, network)
	}

	timeWindows := make([]*pb_lab.FrontendConfig_TimeWindow, 0, len(b.config.TimeWindows))
	for _, window := range b.config.TimeWindows {
		timeWindows = append(timeWindows, &pb_lab.FrontendConfig_TimeWindow{
			File:  window.File,
			Label: window.Label,
			Range: window.Range,
			Step:  window.Step,
		})
	}

	return &pb_lab.FrontendConfig_BeaconChainTimingsModule{
		Enabled:     b.config.Enabled != nil && *b.config.Enabled,
		Networks:    networks,
		PathPrefix:  b.baseDir,
		TimeWindows: timeWindows,
	}
}

func (b *BeaconChainTimings) processLoop() {
	// Use a ticker for regular checks
	interval := b.config.GetIntervalDuration()
	if interval <= 0 {
		interval = 5 * time.Second
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	// Initial processing run immediately if leader
	if b.leaderClient.IsLeader() {
		b.process(b.processCtx)
	}

	for {
		select {
		case <-b.processCtx.Done():
			b.log.Info("Context cancelled, stopping BeaconChainTimings processing loop")
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

func (b *BeaconChainTimings) Name() string {
	return BeaconChainTimingsServiceName
}

func (b *BeaconChainTimings) BaseDirectory() string {
	return b.baseDir
}

func (b *BeaconChainTimings) GetTimeWindows() []TimeWindow {
	return b.config.TimeWindows
}

func (b *BeaconChainTimings) process(ctx context.Context) {
	startTime := time.Now()

	// Track overall processing cycle if metrics are available
	counter, err := b.metricsCollector.NewCounterVec(
		"processing_operations_total",
		"Total number of processing operations",
		[]string{"operation", "network", "window"},
	)
	if err == nil {
		counter.WithLabelValues("process_cycle", "all", "all").Inc()
	}

	// Get the current state
	var st *pb.State

	st, err = b.stateClient.Get(ctx)
	if err != nil {
		if err == state.ErrNotFound {
			b.log.Debug("No existing state found, using initialized default state!")

			st = NewState()
		} else {
			b.log.WithError(err).Error("Failed to get state, using initialized default state")

			// Record error metric if available
			errorCounter, metricErr := b.metricsCollector.NewCounterVec(
				"processing_errors_total",
				"Total number of processing errors",
				[]string{"operation", "network", "window"},
			)
			if metricErr == nil {
				errorCounter.WithLabelValues("process_cycle", "all", "all").Inc()
			}

			return
		}
	}

	// Verify we have valid networks to process
	if b.ethereumConfig == nil || len(b.ethereumConfig.Networks) == 0 {
		b.log.Warn("No networks configured to process, skipping")
		return
	}

	// Verify we have valid time windows to process
	if b.config == nil || len(b.config.TimeWindows) == 0 {
		b.log.Warn("No time windows configured to process, skipping")
		return
	}

	// Process each network
	for _, network := range b.ethereumConfig.Networks {
		// Skip nil networks (shouldn't happen, but defensive)
		if network == nil {
			b.log.Warn("Encountered nil network, skipping")
			continue
		}

		// Check if it's time to process
		for _, window := range b.config.TimeWindows {
			// Skip empty window configurations
			if window.File == "" {
				b.log.Warn("Encountered empty window file name, skipping")
				continue
			}

			// Create a unique state key for this network+window combination
			stateKey := network.Name + "/" + window.File

			// Process block timings
			lastProcessedTime := time.Time{}
			if ts, ok := st.BlockTimings.LastProcessed[stateKey]; ok {
				lastProcessedTime = TimeFromTimestamp(ts)
			}

			shouldProcess, err := b.shouldProcess(network.Name, window.File, lastProcessedTime)
			if err != nil {
				b.log.WithError(err).Errorf("failed to check if should process block timings for network %s, window %s", network.Name, window.File)
				continue
			}

			if shouldProcess {
				if err := b.processBlockTimings(b.processCtx, network, window.File); err != nil {
					b.log.WithError(err).Errorf("failed to process block timings for network %s, window %s", network.Name, window.File)
				} else {
					// Update state
					st.BlockTimings.LastProcessed[stateKey] = timestamppb.Now()
				}
			}

			// Process CDF data
			lastProcessedTime = time.Time{}
			if ts, ok := st.Cdf.LastProcessed[stateKey]; ok {
				lastProcessedTime = TimeFromTimestamp(ts)
			}

			shouldProcess, err = b.shouldProcess(network.Name, window.File, lastProcessedTime)
			if err != nil {
				b.log.WithError(err).Errorf("failed to check if should process CDF for network %s, window %s", network.Name, window.File)
				continue
			}

			if shouldProcess {
				if err := b.processSizeCDF(b.processCtx, network, &pb.TimeWindowConfig{
					Name:    window.Label,
					File:    window.File,
					RangeMs: window.GetRangeDuration().Milliseconds(),
					StepMs:  window.GetStepDuration().Milliseconds(),
				}); err != nil {
					b.log.WithError(err).Errorf("failed to process size CDF for network %s, window %s", network.Name, window.File)
				} else {
					// Update state
					st.Cdf.LastProcessed[stateKey] = timestamppb.Now()
				}
			}
		}
	}

	// Update the state
	if err := b.stateClient.Set(ctx, st); err != nil {
		b.log.WithError(err).Error("failed to store state")

		// Record error metric if available
		errorCounter, metricErr := b.metricsCollector.NewCounterVec(
			"processing_errors_total",
			"Total number of processing errors",
			[]string{"operation", "network", "window"},
		)
		if metricErr == nil {
			errorCounter.WithLabelValues("state_update", "all", "all").Inc()
		}
	}

	// Record duration metric for the entire processing cycle if available
	duration := time.Since(startTime).Seconds()
	histogram, err := b.metricsCollector.NewHistogramVec(
		"processing_duration_seconds",
		"Duration of processing operations in seconds",
		[]string{"operation", "network", "window"},
		nil,
	)
	if err == nil {
		histogram.WithLabelValues("process_cycle", "all", "all").Observe(duration)
	}

	// Update state metrics
	b.updateStateMetrics(st)
}

// shouldProcess determines if a network/window should be processed based on last processing time
func (b *BeaconChainTimings) shouldProcess(network, window string, lastProcessed time.Time) (bool, error) {
	b.log.WithFields(logrus.Fields{
		"network": network,
		"window":  window,
	}).Debug("Checking if should process")

	// If we don't have state yet or it's been long enough since the last update, process
	if lastProcessed.IsZero() {
		// Track decision if metrics are available
		counter, err := b.metricsCollector.NewCounterVec(
			"processing_decisions_total",
			"Total number of processing decisions",
			[]string{"decision", "reason", "network", "window"},
		)
		if err == nil {
			counter.WithLabelValues("process", "no_previous_state", network, window).Inc()
		}
		return true, nil
	}

	// Check if it's been long enough since the last update
	timeSinceLastUpdate := time.Since(lastProcessed)
	if timeSinceLastUpdate > b.config.GetIntervalDuration() {
		// Track decision if metrics are available
		counter, err := b.metricsCollector.NewCounterVec(
			"processing_decisions_total",
			"Total number of processing decisions",
			[]string{"decision", "reason", "network", "window"},
		)
		if err == nil {
			counter.WithLabelValues("process", "interval_elapsed", network, window).Inc()
		}
		return true, nil
	}

	// Track decision to skip if metrics are available
	counter, err := b.metricsCollector.NewCounterVec(
		"processing_decisions_total",
		"Total number of processing decisions",
		[]string{"decision", "reason", "network", "window"},
	)
	if err == nil {
		counter.WithLabelValues("skip", "recent_update", network, window).Inc()
	}

	return false, nil
}

// updateStateMetrics updates the state metrics based on the current state
func (b *BeaconChainTimings) updateStateMetrics(state *pb.State) {
	if b.metricsCollector == nil || b.stateLastProcessedMetric == nil || b.stateAgeMetric == nil {
		return
	}

	now := time.Now()

	// Process block timings state
	for stateKey, timestamp := range state.BlockTimings.LastProcessed {
		// Parse network/window from the stateKey (format: "network/window")
		parts := strings.Split(stateKey, "/")
		if len(parts) != 2 {
			b.log.WithField("state_key", stateKey).Warn("Invalid state key format for metrics")
			continue
		}
		network := parts[0]
		window := parts[1]
		dataType := "block_timings"

		// Get the timestamp as time.Time
		lastProcessed := TimeFromTimestamp(timestamp)
		if !lastProcessed.IsZero() {
			// Record last processed time
			b.stateLastProcessedMetric.WithLabelValues(network, window, dataType).Set(float64(lastProcessed.Unix()))

			// Record age in seconds
			ageSeconds := now.Sub(lastProcessed).Seconds()
			b.stateAgeMetric.WithLabelValues(network, window, dataType).Set(ageSeconds)
		}
	}

	// Process CDF state
	for stateKey, timestamp := range state.Cdf.LastProcessed {
		// Parse network/window from the stateKey (format: "network/window")
		parts := strings.Split(stateKey, "/")
		if len(parts) != 2 {
			b.log.WithField("state_key", stateKey).Warn("Invalid state key format for metrics")
			continue
		}
		network := parts[0]
		window := parts[1]
		dataType := "cdf"

		// Get the timestamp as time.Time
		lastProcessed := TimeFromTimestamp(timestamp)
		if !lastProcessed.IsZero() {
			// Record last processed time
			b.stateLastProcessedMetric.WithLabelValues(network, window, dataType).Set(float64(lastProcessed.Unix()))

			// Record age in seconds
			ageSeconds := now.Sub(lastProcessed).Seconds()
			b.stateAgeMetric.WithLabelValues(network, window, dataType).Set(ageSeconds)
		}
	}
}
