package beacon_slots

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/ethereum"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/leader"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/locker"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/metrics"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/xatu"
	"github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_slots"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// LocallyBuiltBlocksProcessor handles the processing of locally built blocks
type LocallyBuiltBlocksProcessor struct {
	log               logrus.FieldLogger
	config            *LocallyBuiltBlocksConfig
	headDelaySlots    phase0.Slot
	ethClient         *ethereum.Client
	xatuClient        *xatu.Client
	cacheClient       cache.Client
	lockerClient      locker.Locker
	metricsSvc        *metrics.Metrics
	processCtxCancel  context.CancelFunc
	leaderClient      leader.Client
	processingEnabled bool
}

// NewLocallyBuiltBlocksProcessor creates a new processor for locally built blocks
func NewLocallyBuiltBlocksProcessor(
	log logrus.FieldLogger,
	config *LocallyBuiltBlocksConfig,
	headDelaySlots phase0.Slot,
	ethClient *ethereum.Client,
	xatuClient *xatu.Client,
	cacheClient cache.Client,
	lockerClient locker.Locker,
	metricsSvc *metrics.Metrics,
) *LocallyBuiltBlocksProcessor {
	return &LocallyBuiltBlocksProcessor{
		log:               log.WithField("processor", "locally_built_blocks"),
		config:            config,
		headDelaySlots:    headDelaySlots,
		ethClient:         ethClient,
		xatuClient:        xatuClient,
		cacheClient:       cacheClient,
		lockerClient:      lockerClient,
		metricsSvc:        metricsSvc,
		processingEnabled: config.Enabled != nil && *config.Enabled,
	}
}

// Start begins the processor's operations
func (p *LocallyBuiltBlocksProcessor) Start(ctx context.Context) error {
	if !p.processingEnabled {
		p.log.Info("Locally built blocks processor disabled")

		return nil
	}

	p.log.Info("Starting locally built blocks processor")

	// Create a leader election for this processor
	leaderClient := leader.New(p.log, p.lockerClient, leader.Config{
		Resource:        ServiceName + "/locally_built_blocks",
		TTL:             5 * time.Second,
		RefreshInterval: 1 * time.Second, // Refresh every second (5x before TTL expires)

		OnElected: func() {
			p.log.Info("Became leader for locally built blocks processor")

			// Check if cancellation function exists, indicating processing might be active
			// Note: This check isn't foolproof against race conditions if OnElected is called rapidly,
			// but leader election should prevent that.
			if p.processCtxCancel != nil {
				p.log.Info("Processing context cancel function already exists, assuming processing is active, skipping start.")

				return
			}

			// Create a new context for the process, derived from the Start context
			processCtx, processCancel := context.WithCancel(ctx)

			p.processCtxCancel = processCancel

			// Start processing in a goroutine, passing the new context
			go p.startProcessing(processCtx)
		},
		OnRevoked: func() {
			p.log.Info("Lost leadership for locally built blocks processor")
			p.stopProcessing()
		},
	}, p.metricsSvc) // Renamed usage

	leaderClient.Start()
	p.leaderClient = leaderClient

	return nil
}

// Stop terminates the processor's operations
func (p *LocallyBuiltBlocksProcessor) Stop() {
	p.log.Info("Stopping locally built blocks processor")

	if p.leaderClient != nil {
		p.leaderClient.Stop()
	}

	p.stopProcessing()

	p.log.Info("Locally built blocks processor stopped")
}

// stopProcessing safely stops all running processing
func (p *LocallyBuiltBlocksProcessor) stopProcessing() {
	if p.processCtxCancel != nil {
		p.processCtxCancel()
		p.processCtxCancel = nil
	}
}

// startProcessing begins the main processing loop, using the provided context
func (p *LocallyBuiltBlocksProcessor) startProcessing(ctx context.Context) {
	p.log.Info("Starting locally built blocks processing")

	// Process each network using the passed context
	for _, network := range p.ethClient.Networks() {
		go p.processNetworkBlocks(ctx, network.Name)
	}

	// Wait for context cancellation using the passed context
	<-ctx.Done()
	p.log.Info("Context cancelled, locally built blocks processing will stop")
}

// processNetworkBlocks processes locally built blocks for a specific network
func (p *LocallyBuiltBlocksProcessor) processNetworkBlocks(ctx context.Context, networkName string) {
	logCtx := p.log.WithField("network", networkName)
	logCtx.Info("Starting locally built blocks processing for network")

	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	lastProcessedSlot := phase0.Slot(0)

	// Initial processing
	startSlot, endSlot, err := p.getSlotRange(ctx, networkName)
	if err == nil {
		for slot := startSlot; slot <= endSlot; slot++ {
			// Process each slot individually
			p.processLocallyBuiltBlocksForSlot(ctx, networkName, slot)
		}

		// Update the last processed slot
		lastProcessedSlot = endSlot
	}

	for {
		select {
		case <-ctx.Done():
			logCtx.Info("Context cancelled, stopping locally built blocks processing for network")

			return
		case <-ticker.C:
			currentSlot, err := p.getCurrentSlot(ctx, networkName)
			if err != nil {
				logCtx.WithError(err).Error("Failed to get current slot")

				continue
			}

			if currentSlot > lastProcessedSlot {
				// Process each new slot individually
				for slot := lastProcessedSlot + 1; slot <= currentSlot; slot++ {
					p.processLocallyBuiltBlocksForSlot(ctx, networkName, slot)
				}

				lastProcessedSlot = currentSlot
			}
		}
	}
}

// getSlotRange gets the start and end slot for processing
func (p *LocallyBuiltBlocksProcessor) getSlotRange(ctx context.Context, networkName string) (phase0.Slot, phase0.Slot, error) {
	nowSlot, err := p.getCurrentSlot(ctx, networkName)
	if err != nil {
		return 0, 0, err
	}

	// Go back config slots
	endSlot := nowSlot
	startSlot := endSlot - phase0.Slot(p.config.Slots) //nolint:gosec // not a security issue

	return startSlot, endSlot, nil
}

// getCurrentSlot returns the current slot for a network
func (p *LocallyBuiltBlocksProcessor) getCurrentSlot(ctx context.Context, networkName string) (phase0.Slot, error) {
	slot, _, err := p.ethClient.GetNetwork(networkName).GetWallclock().Now()
	if err != nil {
		return 0, fmt.Errorf("failed to get current slot: %w", err)
	}

	// Add on our head delay slots
	headDelaySlots := p.headDelaySlots

	return phase0.Slot(slot.Number()) - headDelaySlots, nil
}

// processLocallyBuiltBlocksForSlot processes locally built blocks for a specific slot in a network
func (p *LocallyBuiltBlocksProcessor) processLocallyBuiltBlocksForSlot(ctx context.Context, networkName string, slot phase0.Slot) {
	logCtx := p.log.WithFields(logrus.Fields{
		"network": networkName,
		"feature": "locally_built_blocks",
		"slot":    slot,
	})

	// Acquire slot-level lock to prevent concurrent processing of the same slot
	lockKey := fmt.Sprintf("locally_built_blocks:slot:%s:%d", networkName, slot)
	lockTTL := 30 * time.Second // Allow enough time for processing

	// Try to acquire the lock
	token, acquired, err := p.lockerClient.Lock(lockKey, lockTTL)
	if err != nil {
		logCtx.WithError(err).Warn("Error acquiring slot lock for locally built blocks")

		return
	}

	if !acquired {
		// Another processor is already handling this slot
		logCtx.Debug("Slot already being processed by another processor, skipping")

		return
	}

	// Ensure we release the lock when done
	defer func() {
		released, err := p.lockerClient.Unlock(lockKey, token)
		if err != nil {
			logCtx.WithError(err).Warn("Failed to release slot lock")
		} else if !released {
			logCtx.Warn("Lock was not released (token invalid or lock expired)")
		}
	}()

	// Check if we already have this slot data cached
	cacheKey := GetLocallyBuiltBlockSlotCacheKey(networkName, slot)
	cachedData, err := p.cacheClient.Get(cacheKey)

	if err == nil && len(cachedData) > 0 {
		logCtx.Debug("Slot data already cached, skipping processing")

		return
	}

	logCtx.Debug("Processing locally built blocks for slot")

	// Get Clickhouse client for the network
	ch, err := p.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		logCtx.WithError(err).Error("Failed to get Clickhouse client")

		return
	}

	// Query to get the slot's validator blocks
	query := `
		SELECT
			slot,
			meta_client_name,
			meta_client_version,
			meta_client_implementation,
			meta_client_geo_city,
			meta_client_geo_country,
			meta_client_geo_country_code,
			meta_client_geo_continent_code,
			meta_client_geo_longitude,
			meta_client_geo_latitude,
			meta_consensus_version,
			meta_consensus_implementation,
			meta_network_name,
			event_date_time,
			slot_start_date_time,
			block_version,
			block_total_bytes,
			block_total_bytes_compressed,
			consensus_payload_value,
			execution_payload_value,
			execution_payload_block_number,
			execution_payload_gas_limit,
			execution_payload_gas_used,
			execution_payload_transactions_count,
			execution_payload_transactions_total_bytes,
			execution_payload_transactions_total_bytes_compressed
		FROM beacon_api_eth_v3_validator_block
		WHERE
			slot = ?
			AND meta_network_name = ?
		ORDER BY slot_start_date_time DESC
	`

	// Execute the query
	rows, err := ch.Query(
		ctx,
		query,
		uint32(slot), //nolint:gosec // not a security issue
		networkName,
	)
	if err != nil {
		logCtx.WithError(err).Error("Failed to query Clickhouse for locally built blocks")

		return
	}

	// Process the results
	blocks := []*beacon_slots.LocallyBuiltBlock{}

	for _, row := range rows {
		dbSlot, ok := row["slot"].(uint32)
		if !ok {
			logCtx.WithField("row", row).Warn("Invalid slot value in Clickhouse result")

			continue
		}

		// Skip if not the requested slot (shouldn't happen due to WHERE clause, but just for safety)
		// Compare as uint64 to avoid gocritic truncateCmp warning and type mismatch
		if uint64(dbSlot) != uint64(slot) {
			continue
		}

		var timestamp time.Time
		if eventTime, ok := row["event_date_time"].(time.Time); ok {
			timestamp = eventTime
		}

		var slotStartDateTime time.Time
		if slotStartTime, ok := row["slot_start_date_time"].(time.Time); ok {
			slotStartDateTime = slotStartTime
		}

		clientName, _ := row["meta_client_name"].(string)
		clientVersion, _ := row["meta_client_version"].(string)
		clientImpl, _ := row["meta_client_implementation"].(string)
		geoCity, _ := row["meta_client_geo_city"].(string)
		geoCountry, _ := row["meta_client_geo_country"].(string)
		geoCountryCode, _ := row["meta_client_geo_country_code"].(string)
		geoContinentCode, _ := row["meta_client_geo_continent_code"].(string)
		consensusImpl, _ := row["meta_consensus_implementation"].(string)
		networkName, _ := row["meta_network_name"].(string)

		var geoLongitude, geoLatitude float64
		if val, ok := row["meta_client_geo_longitude"].(float64); ok {
			geoLongitude = val
		}

		if val, ok := row["meta_client_geo_latitude"].(float64); ok {
			geoLatitude = val
		}

		consensusVersion, _ := row["meta_consensus_version"].(string)
		blockVersion, _ := row["block_version"].(string)

		var blockTotalBytes, blockTotalBytesCompressed uint32
		if val, ok := row["block_total_bytes"].(uint32); ok {
			blockTotalBytes = val
		}

		if val, ok := row["block_total_bytes_compressed"].(uint32); ok {
			blockTotalBytesCompressed = val
		}

		var execPayloadValue, consensusPayloadValue uint64
		if val, ok := row["execution_payload_value"].(uint64); ok {
			execPayloadValue = val
		}

		if val, ok := row["consensus_payload_value"].(uint64); ok {
			consensusPayloadValue = val
		}

		var execPayloadBlockNumber uint32
		if val, ok := row["execution_payload_block_number"].(uint32); ok {
			execPayloadBlockNumber = val
		}

		var execPayloadGasLimit, execPayloadGasUsed uint64
		if val, ok := row["execution_payload_gas_limit"].(uint64); ok {
			execPayloadGasLimit = val
		}

		if val, ok := row["execution_payload_gas_used"].(uint64); ok {
			execPayloadGasUsed = val
		}

		var execPayloadTxCount, execPayloadTxTotalBytes, execPayloadTxTotalBytesCompressed uint32

		if val, ok := row["execution_payload_transactions_count"].(uint32); ok {
			execPayloadTxCount = val
		}

		if val, ok := row["execution_payload_transactions_total_bytes"].(uint32); ok {
			execPayloadTxTotalBytes = val
		}

		if val, ok := row["execution_payload_transactions_total_bytes_compressed"].(uint32); ok {
			execPayloadTxTotalBytesCompressed = val
		}

		// Create validator block as LocallyBuiltBlock
		validatorBlock := &beacon_slots.LocallyBuiltBlock{
			Slot:              uint64(dbSlot),
			SlotStartDateTime: timestamppb.New(slotStartDateTime),
			Metadata: &beacon_slots.LocallyBuiltBlockMetadata{
				MetaClientName:              clientName,
				EventDateTime:               timestamppb.New(timestamp),
				MetaClientVersion:           clientVersion,
				MetaClientImplementation:    clientImpl,
				MetaClientGeoCity:           geoCity,
				MetaClientGeoCountry:        geoCountry,
				MetaClientGeoCountryCode:    geoCountryCode,
				MetaClientGeoContinentCode:  geoContinentCode,
				MetaClientGeoLongitude:      geoLongitude,
				MetaClientGeoLatitude:       geoLatitude,
				MetaConsensusVersion:        consensusVersion,
				MetaConsensusImplementation: consensusImpl,
				MetaNetworkName:             networkName,
			},
			BlockVersion:                                     blockVersion,
			BlockTotalBytes:                                  blockTotalBytes,
			BlockTotalBytesCompressed:                        blockTotalBytesCompressed,
			ExecutionPayloadValue:                            execPayloadValue,
			ConsensusPayloadValue:                            consensusPayloadValue,
			ExecutionPayloadBlockNumber:                      execPayloadBlockNumber,
			ExecutionPayloadGasLimit:                         execPayloadGasLimit,
			ExecutionPayloadGasUsed:                          execPayloadGasUsed,
			ExecutionPayloadTransactionsCount:                execPayloadTxCount,
			ExecutionPayloadTransactionsTotalBytes:           execPayloadTxTotalBytes,
			ExecutionPayloadTransactionsTotalBytesCompressed: execPayloadTxTotalBytesCompressed,
		}

		// Add the block to our list
		blocks = append(blocks, validatorBlock)
	}

	// Create a slot blocks object
	slotBlocks := &beacon_slots.LocallyBuiltSlotBlocks{
		Slot:   uint64(slot),
		Blocks: blocks,
	}

	// Cache the slot data
	if len(blocks) > 0 {
		cacheData, err := json.Marshal(slotBlocks)
		if err != nil {
			logCtx.WithError(err).Warn("Failed to serialize slot blocks for caching")
		} else {
			// Cache for 5 minutes
			err = p.cacheClient.Set(cacheKey, cacheData, 5*time.Minute)
			if err != nil {
				logCtx.WithError(err).Warn("Failed to cache slot blocks")
			} else {
				logCtx.WithField("blocksCount", len(blocks)).Debug("Successfully cached locally built blocks for slot")
			}
		}
	}
}

// GetLocallyBuiltBlockSlotCacheKey returns the cache key for locally built blocks for a specific slot
func GetLocallyBuiltBlockSlotCacheKey(network string, slot phase0.Slot) string {
	return fmt.Sprintf("locally_built_blocks/%s/%d", network, slot)
}

// FetchRecentLocallyBuiltBlocks retrieves the recent locally built blocks for a network
func (b *BeaconSlots) FetchRecentLocallyBuiltBlocks(ctx context.Context, networkName string) ([]*beacon_slots.LocallyBuiltSlotBlocks, error) {
	if b.config.LocallyBuiltBlocksConfig.Enabled == nil || !*b.config.LocallyBuiltBlocksConfig.Enabled {
		return nil, fmt.Errorf("locally built blocks feature is disabled")
	}

	if b.ethereum.GetNetwork(networkName) == nil {
		return nil, fmt.Errorf("network not found")
	}

	logCtx := b.log.WithFields(logrus.Fields{
		"network": networkName,
		"feature": "locally_built_blocks",
	})

	slotInfo, _, err := b.ethereum.GetNetwork(networkName).GetWallclock().Now()
	if err != nil {
		return nil, fmt.Errorf("failed to get current time: %w", err)
	}

	nowSlot := phase0.Slot(slotInfo.Number())

	// Fetch data for each slot
	result := make([]*beacon_slots.LocallyBuiltSlotBlocks, 0, b.config.LocallyBuiltBlocksConfig.Slots)

	for slot := nowSlot - phase0.Slot(b.config.LocallyBuiltBlocksConfig.Slots); slot <= nowSlot; slot++ { //nolint:gosec // not a security issue
		slotCacheKey := GetLocallyBuiltBlockSlotCacheKey(networkName, slot)

		slotData, err := b.cacheClient.Get(slotCacheKey)
		if err != nil {
			// Skip slots that don't have cached data
			continue
		}

		// Deserialize the slot data
		var slotBlocks beacon_slots.LocallyBuiltSlotBlocks
		if err := json.Unmarshal(slotData, &slotBlocks); err != nil {
			logCtx.WithError(err).WithField("slot", slot).Warn("Failed to deserialize slot data")

			continue
		}

		result = append(result, &slotBlocks)
	}

	// Sort the result by slot (descending)
	sort.Slice(result, func(i, j int) bool {
		return result[i].Slot > result[j].Slot
	})

	// Return the combined result
	if len(result) == 0 {
		return []*beacon_slots.LocallyBuiltSlotBlocks{}, status.Errorf(codes.NotFound, "no locally built blocks found")
	}

	return result, nil
}
