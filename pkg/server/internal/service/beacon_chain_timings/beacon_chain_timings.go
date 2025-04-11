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
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_chain_timings"
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/types/known/timestamppb"
)

const (
	BeaconChainTimingsServiceName = "beacon_chain_timings"
)

// DefaultTimeWindows defines time window configurations for processing
var DefaultTimeWindows = []TimeWindowConfig{
	{
		File:    "1h",
		Label:   "Last hour",
		RangeMs: 60 * 60 * 1000, // 1 hour in milliseconds
	},
	{
		File:    "4h",
		Label:   "Last 4 hours",
		RangeMs: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
	},
	{
		File:    "24h",
		Label:   "Last 24 hours",
		RangeMs: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
	},
	{
		File:    "7d",
		Label:   "Last 7 days",
		RangeMs: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
	},
}

// TimeWindowConfig represents configuration for a time window
type TimeWindowConfig struct {
	File    string
	Label   string
	RangeMs int64
}

// Data structures for processing
type TimingData struct {
	Network    string
	Timestamp  *timestamppb.Timestamp
	Validators map[string]*TimingData_ValidatorCategory
}

type TimingData_ValidatorCategory struct {
	Categories map[string]int32
}

type SizeCDFData struct {
	Network        string
	Timestamp      *timestamppb.Timestamp
	SizesKb        []int64
	ArrivalTimesMs map[string]*SizeCDFData_DoubleList
	Mev            map[string]float64
	NonMev         map[string]float64
	SoloMev        map[string]float64
	SoloNonMev     map[string]float64
	All            map[string]float64
}

type SizeCDFData_DoubleList struct {
	Values []float64
}

type ProcessorState struct {
	Network       string
	LastProcessed *timestamppb.Timestamp
}

// DataProcessorParams holds parameters for data processing
type DataProcessorParams struct {
	NetworkName string
	WindowName  string
}

func GetStoragePath(key string) string {
	return fmt.Sprintf("%s/%s", BeaconChainTimingsServiceName, key)
}

type BeaconChainTimings struct {
	log logrus.FieldLogger

	config *Config

	ethereumConfig *ethereum.Config
	xatuClient     *xatu.Client
	storageClient  storage.Client
	cacheClient    cache.Client
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
	xatuClient *xatu.Client,
	ethereumConfig *ethereum.Config,
	storageClient storage.Client,
	cacheClient cache.Client,
	lockerClient locker.Locker,
) (*BeaconChainTimings, error) {
	return &BeaconChainTimings{
		log:            log.WithField("component", "service/beacon_chain_timings"),
		config:         config,
		ethereumConfig: ethereumConfig,
		xatuClient:     xatuClient,
		storageClient:  storageClient,
		cacheClient:    cacheClient,
		lockerClient:   lockerClient,

		baseDir: BeaconChainTimingsServiceName,

		processCtx:       nil,
		processCtxCancel: nil,
	}, nil
}

func (b *BeaconChainTimings) Start(ctx context.Context) error {
	b.log.Info("Starting BeaconChainTimings service")

	leader := leader.New(b.log, b.lockerClient, leader.Config{
		Resource:        BeaconChainTimingsServiceName + "/batch_processing",
		TTL:             30 * time.Second,
		RefreshInterval: 5 * time.Second,

		OnElected: func() {
			b.log.Info("Became leader")

			if b.processCtx != nil {
				// We are already processing, so we don't need to start a new one
				b.log.Info("Already processing, skipping")

				return
			}

			// Create a new context for the process
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

func (b *BeaconChainTimings) Stop() {
	b.leaderClient.Stop()
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
		b.process()
	}

	for {
		select {
		case <-b.processCtx.Done():
			b.log.Info("Context cancelled, stopping BeaconChainTimings processing loop")
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

func (b *BeaconChainTimings) Name() string {
	return BeaconChainTimingsServiceName
}

func (b *BeaconChainTimings) process() {
	// Create a new state with initialized data structures to ensure sane defaults
	state := &State{
		BlockTimings: DataTypeState{
			LastProcessed: make(map[string]time.Time),
		},
		Cdf: DataTypeState{
			LastProcessed: make(map[string]time.Time),
		},
	}

	// Pre-initialize state for all networks to ensure they exist
	if b.ethereumConfig != nil && len(b.ethereumConfig.Networks) > 0 {
		for _, network := range b.ethereumConfig.Networks {
			if network != nil {
				state.BlockTimings.LastProcessed[network.Name] = time.Time{} // Zero time
				state.Cdf.LastProcessed[network.Name] = time.Time{}          // Zero time
			}
		}
	}

	// Try to load existing state
	err := b.storageClient.GetEncoded(GetStoragePath(GetStateKey()), state, storage.CodecNameJSON)
	if err != nil {
		if err != storage.ErrNotFound && !strings.Contains(err.Error(), "not found") {
			b.log.WithError(err).Error("Failed to get state, using initialized default state")
		} else {
			// Not found is fine for first run, just log at debug level
			b.log.Debug("No existing state found, using initialized default state")
		}
		// Continue with the empty state initialized above
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

	needStorageUpdate := false

	// Process each network
	for _, network := range b.ethereumConfig.Networks {
		// Skip nil networks (shouldn't happen, but defensive)
		if network == nil {
			b.log.Warn("Encountered nil network, skipping")
			continue
		}

		// Ensure maps are initialized for this network
		if _, ok := state.BlockTimings.LastProcessed[network.Name]; !ok {
			state.BlockTimings.LastProcessed[network.Name] = time.Time{}
		}
		if _, ok := state.Cdf.LastProcessed[network.Name]; !ok {
			state.Cdf.LastProcessed[network.Name] = time.Time{}
		}

		// Check if it's time to process
		for _, window := range b.config.TimeWindows {
			// Skip empty window configurations
			if window.File == "" {
				b.log.Warn("Encountered empty window file name, skipping")
				continue
			}

			// Process block timings
			shouldProcess, err := b.shouldProcess(network.Name, window.File, state.BlockTimings.LastProcessed[network.Name])
			if err != nil {
				b.log.WithError(err).Errorf("failed to check if should process block timings for network %s, window %s", network.Name, window.File)
				continue
			}

			if shouldProcess {
				if err := b.processBlockTimings(b.processCtx, network, window.File); err != nil {
					b.log.WithError(err).Errorf("failed to process block timings for network %s, window %s", network.Name, window.File)
				} else {
					// Update state
					state.BlockTimings.LastProcessed[network.Name] = time.Now().UTC()
					needStorageUpdate = true
				}
			}

			// Process CDF data
			shouldProcess, err = b.shouldProcess(network.Name, window.File, state.Cdf.LastProcessed[network.Name])
			if err != nil {
				b.log.WithError(err).Errorf("failed to check if should process CDF for network %s, window %s", network.Name, window.File)
				continue
			}

			if shouldProcess {
				if err := b.processSizeCDF(b.processCtx, network, &pb.TimeWindowConfig{
					Name: window.File,
					File: window.File,
				}); err != nil {
					b.log.WithError(err).Errorf("failed to process size CDF for network %s, window %s", network.Name, window.File)
				} else {
					// Update state
					state.Cdf.LastProcessed[network.Name] = time.Now().UTC()
					needStorageUpdate = true
				}
			}
		}
	}

	if needStorageUpdate {
		// Save the updated state
		_, err := b.storageClient.StoreEncoded(GetStoragePath(GetStateKey()), state, storage.CodecNameJSON)
		if err != nil {
			b.log.WithError(err).Error("failed to store state")
			// Don't return, as we've already done processing work
		} else {
			b.log.Debug("Successfully stored updated state")
		}
	}
}

// shouldProcess determines if a network/window should be processed based on last processing time
func (b *BeaconChainTimings) shouldProcess(network, window string, lastProcessed time.Time) (bool, error) {
	b.log.WithFields(logrus.Fields{
		"network": network,
		"window":  window,
	}).Debug("Checking if should process")

	// If we don't have state yet or it's been long enough since the last update, process
	if lastProcessed.IsZero() {
		return true, nil
	}

	// Check if it's been long enough since the last update (15 minutes)
	timeSinceLastUpdate := time.Since(lastProcessed)
	if timeSinceLastUpdate > b.config.GetIntervalDuration() {
		return true, nil
	}

	return false, nil
}
