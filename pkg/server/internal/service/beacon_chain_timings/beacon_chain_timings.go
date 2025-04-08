package beacon_chain_timings

import (
	"context"
	"fmt"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
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
		TTL:             15 * time.Minute,
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
			b.processCtxCancel()
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
	for {
		select {
		case <-b.processCtx.Done():
			b.log.Info("Context cancelled, stopping BeaconChainTimings")

			return
		case <-time.After(5 * time.Second):
			if b.leaderClient.IsLeader() {
				b.process()
			}
		}
	}

}

func (b *BeaconChainTimings) Name() string {
	return BeaconChainTimingsServiceName
}

func (b *BeaconChainTimings) process() {
	// Fetch the latest state from storage
	state := &State{
		BlockTimings: DataTypeState{
			LastProcessed: make(map[string]time.Time),
		},
		Cdf: DataTypeState{
			LastProcessed: make(map[string]time.Time),
		},
	}

	err := b.storageClient.GetEncoded(GetStoragePath(GetStateKey()), state, storage.CodecNameJSON)
	if err != nil {
		b.log.Errorf("failed to get state: %v", err)
	}

	needStorageUpdate := false

	// Process each network
	for _, network := range b.ethereumConfig.Networks {
		// Initialize if not exists
		if _, ok := state.BlockTimings.LastProcessed[network.Name]; !ok {
			state.BlockTimings.LastProcessed[network.Name] = time.Time{}
		}
		if _, ok := state.Cdf.LastProcessed[network.Name]; !ok {
			state.Cdf.LastProcessed[network.Name] = time.Time{}
		}

		// Check if it's time to process
		for _, window := range b.config.TimeWindows {
			// Process block timings
			shouldProcess, err := b.shouldProcess(network.Name, window.File, state.BlockTimings.LastProcessed[network.Name])
			if err != nil {
				b.log.WithError(err).Errorf("failed to check if should process block timings for network %s, window %s", network.Name, window.File)
			}

			if shouldProcess {
				if err := b.processBlockTimings(network, window.File); err != nil {
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
			}

			if shouldProcess {
				if err := b.processSizeCDF(network, window.File); err != nil {
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
		if _, err := b.storageClient.StoreEncoded(GetStoragePath(GetStateKey()), state, storage.CodecNameJSON); err != nil {
			b.log.WithError(err).Error("failed to store state")
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
