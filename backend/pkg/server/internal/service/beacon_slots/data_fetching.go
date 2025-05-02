package beacon_slots

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_slots"
	log "github.com/sirupsen/logrus"
)

// ErrEntityNotFound is returned when no entity is found for a validator index
var ErrEntityNotFound = errors.New("no entity found for validator index")

// ErrBlockDataNotFound is returned when no block data is found for a slot
var ErrBlockDataNotFound = errors.New("no block data found for slot")

// ErrNoRowsReturned is a common error string from ClickHouse
const ErrNoRowsReturned = "no rows returned"

// getProposerEntity gets entity for a given validator index
func (b *BeaconSlots) getProposerEntity(ctx context.Context, networkName string, index int64) (*string, error) {
	// Query ClickHouse for the entity
	query := `
		SELECT
			entity
		FROM default.ethseer_validator_entity FINAL
		WHERE
			index = ?
			AND meta_network_name = ?
		GROUP BY entity
		LIMIT 1
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.QueryRow(ctx, query, index, networkName)
	if err != nil {
		if err.Error() == ErrNoRowsReturned {
			return nil, ErrEntityNotFound
		}

		return nil, fmt.Errorf("failed to get entity: %w", err)
	}

	if result == nil || result["entity"] == nil {
		return nil, ErrEntityNotFound
	}

	entity := fmt.Sprintf("%v", result["entity"])

	return &entity, nil
}

// getBlockSeenAtSlotTime gets seen at slot time data for a given slot
func (b *BeaconSlots) getBlockSeenAtSlotTime(ctx context.Context, networkName string, slot phase0.Slot) (map[string]*pb.BlockArrivalTime, error) {
	// Get start and end dates for the slot +- 15 minutes
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		WITH api_events AS (
			SELECT
				propagation_slot_start_diff as slot_time,
				meta_client_name,
				meta_client_geo_city,
				meta_client_geo_country,
				meta_client_geo_continent_code,
				slot_start_date_time
			FROM default.beacon_api_eth_v1_events_block FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		),
		head_events AS (
			SELECT
				propagation_slot_start_diff as slot_time,
				meta_client_name,
				meta_client_geo_city,
				meta_client_geo_country,
				meta_client_geo_continent_code,
				slot_start_date_time
			FROM default.beacon_api_eth_v1_events_block FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		),
		combined_events AS (
			SELECT * FROM api_events
			UNION ALL
			SELECT * FROM head_events
		)
		SELECT
			slot_time,
			meta_client_name,
			meta_client_geo_city,
			meta_client_geo_country,
			meta_client_geo_continent_code
		FROM (
			SELECT *,
				ROW_NUMBER() OVER (PARTITION BY meta_client_name ORDER BY slot_start_date_time ASC) as rn
			FROM combined_events
		) t
		WHERE rn = 1
		ORDER BY slot_start_date_time ASC
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	args := []interface{}{slot, networkName, startStr, endStr, slot, networkName, startStr, endStr}

	// Execute the query
	result, err := ch.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to get block seen at slot time: %w", err)
	}

	if len(result) == 0 {
		return nil, errors.New("no block seen at slot time data found")
	}

	blockSeenAtSlotTime := make(map[string]*pb.BlockArrivalTime)

	for _, row := range result {
		slotTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["slot_time"]), 10, 64)
		if err != nil {
			return nil, fmt.Errorf("failed to parse slot time: %w", err)
		}

		clientName := fmt.Sprintf("%v", row["meta_client_name"])
		clientCity := fmt.Sprintf("%v", row["meta_client_geo_city"])
		clientCountry := fmt.Sprintf("%v", row["meta_client_geo_country"])
		clientContinent := fmt.Sprintf("%v", row["meta_client_geo_continent_code"])

		blockSeenAtSlotTime[clientName] = &pb.BlockArrivalTime{
			SlotTime:                   slotTime,
			MetaClientName:             clientName,
			MetaClientGeoCity:          clientCity,
			MetaClientGeoCountry:       clientCountry,
			MetaClientGeoContinentCode: clientContinent,
		}
	}

	return blockSeenAtSlotTime, nil
}

// getBlobSeenAtSlotTime gets seen at slot time data for blobs in a given slot
func (b *BeaconSlots) getBlobSeenAtSlotTime(ctx context.Context, networkName string, slot phase0.Slot) (map[string]*pb.BlobArrivalTimes, error) {
	// Get start and end dates for the slot +- 15 minutes
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		SELECT
			propagation_slot_start_diff as slot_time,
			meta_client_name,
			meta_client_geo_city,
			meta_client_geo_country,
			meta_client_geo_continent_code,
			blob_index
		FROM (
			SELECT *,
				ROW_NUMBER() OVER (PARTITION BY meta_client_name, blob_index ORDER BY event_date_time ASC) as rn
			FROM default.beacon_api_eth_v1_events_blob_sidecar FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		) t
		WHERE rn = 1
		ORDER BY event_date_time ASC
	`

	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	result, err := ch.Query(ctx, query, slot, networkName, startStr, endStr)
	if err != nil {
		return nil, fmt.Errorf("failed to get blob seen at slot time: %w", err)
	}

	blobTimings := make(map[string]*pb.BlobArrivalTimes)

	for _, row := range result {
		slotTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["slot_time"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		blobIndex, err := strconv.ParseInt(fmt.Sprintf("%v", row["blob_index"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		clientName := fmt.Sprintf("%v", row["meta_client_name"])
		clientCity := fmt.Sprintf("%v", row["meta_client_geo_city"])
		clientCountry := fmt.Sprintf("%v", row["meta_client_geo_country"])
		clientContinent := fmt.Sprintf("%v", row["meta_client_geo_continent_code"])

		if _, exists := blobTimings[clientName]; !exists {
			blobTimings[clientName] = &pb.BlobArrivalTimes{
				ArrivalTimes: make([]*pb.BlobArrivalTime, 0),
			}
		}

		blobTimings[clientName].ArrivalTimes = append(blobTimings[clientName].ArrivalTimes, &pb.BlobArrivalTime{
			SlotTime:                   slotTime,
			BlobIndex:                  blobIndex,
			MetaClientName:             clientName,
			MetaClientGeoCity:          clientCity,
			MetaClientGeoCountry:       clientCountry,
			MetaClientGeoContinentCode: clientContinent,
		})
	}

	return blobTimings, nil
}

// getBlockFirstSeenInP2PSlotTime gets first seen in P2P slot time data for a given slot
func (b *BeaconSlots) getBlockFirstSeenInP2PSlotTime(ctx context.Context, networkName string, slot phase0.Slot) (map[string]*pb.BlockArrivalTime, error) {
	// Get start and end dates for the slot +- 15 minutes
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		SELECT
			propagation_slot_start_diff as slot_time,
			meta_client_name,
			meta_client_geo_city,
			meta_client_geo_country,
			meta_client_geo_continent_code
		FROM (
			SELECT *,
				ROW_NUMBER() OVER (PARTITION BY meta_client_name ORDER BY event_date_time ASC) as rn
			FROM default.libp2p_gossipsub_beacon_block FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		) t
		WHERE rn = 1
		ORDER BY event_date_time ASC
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.Query(ctx, query, slot, networkName, startStr, endStr)
	if err != nil {
		return nil, fmt.Errorf("failed to get block first seen in P2P data: %w", err)
	}

	blockFirstSeenInP2PSlotTime := make(map[string]*pb.BlockArrivalTime)

	for _, row := range result {
		slotTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["slot_time"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		clientName := fmt.Sprintf("%v", row["meta_client_name"])
		clientCity := fmt.Sprintf("%v", row["meta_client_geo_city"])
		clientCountry := fmt.Sprintf("%v", row["meta_client_geo_country"])
		clientContinent := fmt.Sprintf("%v", row["meta_client_geo_continent_code"])

		if _, exists := blockFirstSeenInP2PSlotTime[clientName]; !exists {
			blockFirstSeenInP2PSlotTime[clientName] = &pb.BlockArrivalTime{
				SlotTime:                   slotTime,
				MetaClientName:             clientName,
				MetaClientGeoCity:          clientCity,
				MetaClientGeoCountry:       clientCountry,
				MetaClientGeoContinentCode: clientContinent,
			}
		}
	}

	return blockFirstSeenInP2PSlotTime, nil
}

// getBlobFirstSeenInP2PSlotTime gets first seen in P2P slot time data for blobs in a given slot
func (b *BeaconSlots) getBlobFirstSeenInP2PSlotTime(ctx context.Context, networkName string, slot phase0.Slot) (map[string]*pb.BlobArrivalTimes, error) {
	// Get start and end dates for the slot +- 15 minutes
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		SELECT
			propagation_slot_start_diff as slot_time,
			meta_client_name,
			meta_client_geo_city,
			meta_client_geo_country,
			meta_client_geo_continent_code,
			blob_index
		FROM (
			SELECT *,
				ROW_NUMBER() OVER (PARTITION BY meta_client_name, blob_index ORDER BY event_date_time ASC) as rn
			FROM default.libp2p_gossipsub_blob_sidecar FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		) t
		WHERE rn = 1
		ORDER BY event_date_time ASC
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.Query(ctx, query, slot, networkName, startStr, endStr)
	if err != nil {
		return nil, fmt.Errorf("failed to get blob first seen in P2P data: %w", err)
	}

	blobTimings := make(map[string]*pb.BlobArrivalTimes)

	for _, row := range result {
		slotTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["slot_time"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		blobIndex, err := strconv.ParseInt(fmt.Sprintf("%v", row["blob_index"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		clientName := fmt.Sprintf("%v", row["meta_client_name"])
		clientCity := fmt.Sprintf("%v", row["meta_client_geo_city"])
		clientCountry := fmt.Sprintf("%v", row["meta_client_geo_country"])
		clientContinent := fmt.Sprintf("%v", row["meta_client_geo_continent_code"])

		if _, exists := blobTimings[clientName]; !exists {
			blobTimings[clientName] = &pb.BlobArrivalTimes{
				ArrivalTimes: make([]*pb.BlobArrivalTime, 0),
			}
		}

		blobTimings[clientName].ArrivalTimes = append(blobTimings[clientName].ArrivalTimes, &pb.BlobArrivalTime{
			SlotTime:                   slotTime,
			BlobIndex:                  blobIndex,
			MetaClientName:             clientName,
			MetaClientGeoCity:          clientCity,
			MetaClientGeoCountry:       clientCountry,
			MetaClientGeoContinentCode: clientContinent,
		})
	}

	return blobTimings, nil
}

// getMaximumAttestationVotes gets the maximum attestation votes for a slot
func (b *BeaconSlots) getMaximumAttestationVotes(ctx context.Context, networkName string, slot phase0.Slot) (int64, error) {
	// Get start and end dates for the slot with grace period
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		SELECT 
			MAX(committee_size * (CAST(committee_index AS UInt32) + 1)) as max_attestations
		FROM (
			SELECT
				length(validators) as committee_size,
				committee_index
			FROM default.beacon_api_eth_v1_beacon_committee
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		)
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return 0, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.QueryRow(ctx, query, slot, networkName, startStr, endStr)
	if err != nil {
		return 0, fmt.Errorf("failed to get maximum attestation votes: %w", err)
	}

	if result["max_attestations"] == nil {
		return 0, nil
	}

	// Convert the result to int64
	maxVotes, err := strconv.ParseInt(fmt.Sprintf("%v", result["max_attestations"]), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("failed to parse max attestations: %w", err)
	}

	return maxVotes, nil
}

// getAttestationVotes gets attestation votes for a slot and block root
func (b *BeaconSlots) getAttestationVotes(ctx context.Context, networkName string, slot phase0.Slot, blockRoot string) (map[int64]int64, error) {
	// Get start and end dates for the slot without any grace period
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		WITH 
		raw_data AS (
			SELECT 
				attesting_validator_index,
				MIN(propagation_slot_start_diff) as min_propagation_time
			FROM default.beacon_api_eth_v1_events_attestation
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
				AND beacon_block_root = ?
				AND attesting_validator_index IS NOT NULL
				AND propagation_slot_start_diff <= 12000
			GROUP BY attesting_validator_index
		),
		floor_time AS (
			SELECT MIN(min_propagation_time) as floor_time
			FROM raw_data
		)
		SELECT
			attesting_validator_index,
			FLOOR((min_propagation_time - floor_time) / 50) * 50 + floor_time as min_propagation_time
		FROM raw_data, floor_time
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Execute the query
	result, err := ch.Query(ctx, query, slot, networkName, startStr, endStr, blockRoot)
	if err != nil {
		return nil, fmt.Errorf("failed to get attestation votes: %w", err)
	}

	attestationTimes := make(map[int64]int64)

	for _, row := range result {
		validatorIndex, err := strconv.ParseInt(fmt.Sprintf("%v", row["attesting_validator_index"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		minTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["min_propagation_time"]), 10, 64)
		if err != nil {
			continue // Skip invalid data
		}

		attestationTimes[validatorIndex] = minTime
	}

	return attestationTimes, nil
}

// getBlockData gets block data from ClickHouse
func (b *BeaconSlots) getBlockData(ctx context.Context, networkName string, slot phase0.Slot) (*pb.BlockData, error) {
	// Query ClickHouse for detailed block data
	query := `
		SELECT
			slot,
			block_root,
			parent_root,
			state_root,
			proposer_index,
			block_version,
			eth1_data_block_hash,
			eth1_data_deposit_root,
			execution_payload_block_hash,
			execution_payload_block_number,
			execution_payload_fee_recipient,
			CAST(COALESCE(execution_payload_base_fee_per_gas, 0) AS UInt64) as execution_payload_base_fee_per_gas,
			execution_payload_blob_gas_used,
			execution_payload_excess_blob_gas,
			execution_payload_gas_limit,
			execution_payload_gas_used,
			execution_payload_state_root,
			execution_payload_parent_hash,
			execution_payload_transactions_count,
			execution_payload_transactions_total_bytes,
			execution_payload_transactions_total_bytes_compressed,
			block_total_bytes,
			block_total_bytes_compressed
		FROM default.beacon_api_eth_v2_beacon_block
		WHERE meta_network_name = ? AND slot = ?
		LIMIT 1
	`

	// Get the Clickhouse client for this network
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	result, err := ch.QueryRow(ctx, query, networkName, slot)
	if err != nil {
		return nil, fmt.Errorf("failed to get block data: %w", err)
	}

	if len(result) == 0 {
		return nil, ErrBlockDataNotFound
	}

	// Calculate slot and epoch times
	epoch := b.ethereum.GetNetwork(networkName).GetWallclock().Epochs().FromSlot(uint64(slot))
	slotDetail := b.ethereum.GetNetwork(networkName).GetWallclock().Slots().FromNumber(uint64(slot))

	// Create a new BlockData object with all fields
	blockData := &pb.BlockData{
		//nolint:gosec // no risk of overflow
		Slot:              int64(slot),
		SlotStartDateTime: slotDetail.TimeWindow().Start().Format(time.RFC3339),
		//nolint:gosec // no risk of overflow
		Epoch:                        int64(epoch.Number()),
		EpochStartDateTime:           epoch.TimeWindow().Start().Format(time.RFC3339),
		BlockRoot:                    getStringOrEmpty(result["block_root"]),
		BlockVersion:                 getStringOrEmpty(result["block_version"]),
		ParentRoot:                   getStringOrEmpty(result["parent_root"]),
		StateRoot:                    getStringOrEmpty(result["state_root"]),
		Eth1DataBlockHash:            getStringOrEmpty(result["eth1_data_block_hash"]),
		Eth1DataDepositRoot:          getStringOrEmpty(result["eth1_data_deposit_root"]),
		ExecutionPayloadBlockHash:    getStringOrEmpty(result["execution_payload_block_hash"]),
		ExecutionPayloadFeeRecipient: getStringOrEmpty(result["execution_payload_fee_recipient"]),
		ExecutionPayloadStateRoot:    getStringOrEmpty(result["execution_payload_state_root"]),
		ExecutionPayloadParentHash:   getStringOrEmpty(result["execution_payload_parent_hash"]),
	}

	// Parse numeric fields
	if proposerIndex, err := strconv.ParseInt(fmt.Sprintf("%v", result["proposer_index"]), 10, 64); err == nil {
		blockData.ProposerIndex = proposerIndex
	}

	if execBlockNumber, err := strconv.ParseInt(fmt.Sprintf("%v", result["execution_payload_block_number"]), 10, 64); err == nil {
		blockData.ExecutionPayloadBlockNumber = execBlockNumber
	}

	// Parse nullable numeric fields - set to 0 by default to ensure the field exists
	if val := result["block_total_bytes"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.BlockTotalBytes = num
		}
	} else {
		blockData.BlockTotalBytes = 0
	}

	if val := result["block_total_bytes_compressed"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.BlockTotalBytesCompressed = num
		}
	} else {
		blockData.BlockTotalBytesCompressed = 0
	}

	if val := result["execution_payload_base_fee_per_gas"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadBaseFeePerGas = num
		}
	} else {
		blockData.ExecutionPayloadBaseFeePerGas = 0
	}

	// Always set these fields to ensure they exist in the output, even if zero
	if val := result["execution_payload_blob_gas_used"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadBlobGasUsed = num
		}
	} else {
		blockData.ExecutionPayloadBlobGasUsed = 0
	}

	if val := result["execution_payload_excess_blob_gas"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadExcessBlobGas = num
		}
	} else {
		blockData.ExecutionPayloadExcessBlobGas = 0
	}

	if val := result["execution_payload_gas_limit"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadGasLimit = num
		}
	} else {
		blockData.ExecutionPayloadGasLimit = 0
	}

	if val := result["execution_payload_gas_used"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadGasUsed = num
		}
	} else {
		blockData.ExecutionPayloadGasUsed = 0
	}

	if val := result["execution_payload_transactions_count"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadTransactionsCount = num
		}
	} else {
		blockData.ExecutionPayloadTransactionsCount = 0
	}

	if val := result["execution_payload_transactions_total_bytes"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadTransactionsTotalBytes = num
		}
	} else {
		blockData.ExecutionPayloadTransactionsTotalBytes = 0
	}

	if val := result["execution_payload_transactions_total_bytes_compressed"]; val != nil {
		if num, err := strconv.ParseInt(fmt.Sprintf("%v", val), 10, 64); err == nil {
			blockData.ExecutionPayloadTransactionsTotalBytesCompressed = num
		}
	} else {
		blockData.ExecutionPayloadTransactionsTotalBytesCompressed = 0
	}

	return blockData, nil
}

// getProposerData gets proposer data from ClickHouse
func (b *BeaconSlots) getProposerData(ctx context.Context, networkName string, slot phase0.Slot) (*pb.Proposer, error) {
	query := `
		SELECT
			slot,
			proposer_index
		FROM default.beacon_api_eth_v2_beacon_block
		WHERE meta_network_name = ? AND slot = ?
		LIMIT 1
	`

	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	result, err := ch.QueryRow(ctx, query, networkName, slot)
	if err != nil {
		return nil, fmt.Errorf("failed to get proposer data: %w", err)
	}

	if len(result) == 0 {
		return nil, fmt.Errorf("no proposer data found for slot %d", slot)
	}

	proposerIndex, err := strconv.ParseInt(fmt.Sprintf("%v", result["proposer_index"]), 10, 64)
	if err != nil {
		return nil, fmt.Errorf("failed to parse proposer index: %w", err)
	}

	return &pb.Proposer{
		Slot:                   int64(slot), //nolint:gosec // no risk of overflow
		ProposerValidatorIndex: proposerIndex,
	}, nil
}

// getSlotWindow returns the start and end times for a slot with a 5 minute grace period
func (b *BeaconSlots) getSlotWindow(ctx context.Context, networkName string, slot phase0.Slot) (time.Time, time.Time) {
	slotDetail := b.ethereum.GetNetwork(networkName).GetWallclock().Slots().FromNumber(uint64(slot))

	startTime := slotDetail.TimeWindow().Start().Add(-5 * time.Minute)
	endTime := slotDetail.TimeWindow().End().Add(5 * time.Minute)

	return startTime, endTime
}

// getMevRelayBids fetches MEV relay bid traces for a given slot, wrapped per relay.
// It returns the highest bid per relay per 50ms interval within the slot.
func (b *BeaconSlots) getMevRelayBids(ctx context.Context, networkName string, slot phase0.Slot, slotStartTime time.Time) (map[string]*pb.RelayBids, error) {
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	//nolint:gosec // The time value range is acceptable for uint64 conversion
	slotStartTimeMs := uint64(slotStartTime.UnixMilli())
	timeBucketMs := int64(50) // Define time bucket granularity in ms

	// Calculate time window with 3-minute margin
	startTimeStr := slotStartTime.Add(-3 * time.Minute).Format("2006-01-02 15:04:05")
	endTimeStr := slotStartTime.Add(3 * time.Minute).Format("2006-01-02 15:04:05")

	query := `
		WITH RankedBids AS (
			SELECT
				*,
				timestamp_ms - ? as slot_time, -- Calculate slot_time relative to slot start
				floor((timestamp_ms - ?) / ?) * ? as time_bucket, -- Calculate time bucket
				ROW_NUMBER() OVER (PARTITION BY meta_network_name, floor((timestamp_ms - ?) / ?) ORDER BY CAST(value AS UInt256) DESC) as rn -- Use UInt256 for value comparison
			FROM default.mev_relay_bid_trace
			WHERE 
				slot = ? 
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
				AND (timestamp_ms - ?) BETWEEN -12000 AND 12000 -- Filter for only slot times between -12s and +12s
		)
		SELECT
			relay_name,
			slot,
			parent_hash,
			block_hash,
			builder_pubkey,
			proposer_pubkey,
			proposer_fee_recipient,
			toString(value) AS value, -- Select as string after ranking
			gas_limit,
			gas_used,
			slot_time,
			time_bucket
		FROM RankedBids
		WHERE rn = 1
		ORDER BY
			relay_name, slot_time; -- Order by relay first, then slot_time
	`

	result, err := ch.Query(ctx, query,
		slotStartTimeMs,                             // For slot_time calculation
		slotStartTimeMs, timeBucketMs, timeBucketMs, // For time_bucket calculation
		slotStartTimeMs, timeBucketMs, // For ranking window
		slot, networkName,
		startTimeStr, endTimeStr, // Added slot_start_date_time filter
		slotStartTimeMs) // For slot_time filtering

	if err != nil {
		if err.Error() == ErrNoRowsReturned { // Check specific error string
			log.WithFields(log.Fields{
				"slot":    slot,
				"network": networkName,
			}).Debug("No MEV relay bids found for slot")

			return make(map[string]*pb.RelayBids), nil // Return empty map of the correct type
		}

		return nil, fmt.Errorf("failed to query MEV relay bids: %w", err)
	}

	// Use the wrapper type for the result map
	relayBidsMap := make(map[string]*pb.RelayBids)

	for _, row := range result {
		// Safely parse fields, logging errors for bad data
		relayName := fmt.Sprintf("%v", row["relay_name"])

		rowSlot, err := strconv.ParseUint(fmt.Sprintf("%v", row["slot"]), 10, 64)
		if err != nil {
			log.WithError(err).WithFields(log.Fields{"slot": slot, "network": networkName, "relay": relayName, "field": "slot", "value": row["slot"]}).Warn("Failed to parse relay bid slot")

			continue
		}

		parentHash := fmt.Sprintf("%v", row["parent_hash"])
		blockHash := fmt.Sprintf("%v", row["block_hash"])
		builderPubkey := fmt.Sprintf("%v", row["builder_pubkey"])
		proposerPubkey := fmt.Sprintf("%v", row["proposer_pubkey"])
		proposerFeeRecipient := fmt.Sprintf("%v", row["proposer_fee_recipient"])
		value := fmt.Sprintf("%v", row["value"]) // Value is already string

		gasLimit, err := strconv.ParseUint(fmt.Sprintf("%v", row["gas_limit"]), 10, 64)
		if err != nil {
			log.WithError(err).WithFields(log.Fields{"slot": slot, "network": networkName, "relay": relayName, "field": "gas_limit", "value": row["gas_limit"]}).Warn("Failed to parse relay bid gas_limit")

			gasLimit = 0 // Default to 0 if parsing fails
		}

		gasUsed, err := strconv.ParseUint(fmt.Sprintf("%v", row["gas_used"]), 10, 64)
		if err != nil {
			log.WithError(err).WithFields(log.Fields{"slot": slot, "network": networkName, "relay": relayName, "field": "gas_used", "value": row["gas_used"]}).Warn("Failed to parse relay bid gas_used")

			gasUsed = 0 // Default to 0 if parsing fails
		}

		slotTime, err := strconv.ParseInt(fmt.Sprintf("%v", row["slot_time"]), 10, 64)
		if err != nil {
			log.WithError(err).WithFields(log.Fields{"slot": slot, "network": networkName, "relay": relayName, "field": "slot_time", "value": row["slot_time"]}).Warn("Failed to parse relay bid slot_time")

			continue // Skip because slot_time is crucial
		}

		timeBucket, err := strconv.ParseInt(fmt.Sprintf("%v", row["time_bucket"]), 10, 64)
		if err != nil {
			log.WithError(err).WithFields(log.Fields{"slot": slot, "network": networkName, "relay": relayName, "field": "time_bucket", "value": row["time_bucket"]}).Warn("Failed to parse relay bid time_bucket")

			timeBucket = 0 // Default to 0 if parsing fails
		}

		bid := &pb.RelayBid{
			Slot:                 rowSlot,
			ParentHash:           parentHash,
			BlockHash:            blockHash,
			BuilderPubkey:        builderPubkey,
			ProposerPubkey:       proposerPubkey,
			ProposerFeeRecipient: proposerFeeRecipient,
			Value:                value,
			GasLimit:             gasLimit,
			GasUsed:              gasUsed,
			SlotTime:             int32(slotTime),   //nolint:gosec // Time value is controlled and within int32 range
			TimeBucket:           int32(timeBucket), //nolint:gosec // Time value is controlled and within int32 range
		}

		// Get or create the wrapper for the current relay
		wrapper, exists := relayBidsMap[relayName]
		if !exists {
			wrapper = &pb.RelayBids{Bids: make([]*pb.RelayBid, 0)}
			relayBidsMap[relayName] = wrapper
		}
		// Append the bid to the wrapper's list
		wrapper.Bids = append(wrapper.Bids, bid)
	}

	return relayBidsMap, nil
}

// getMevDeliveredPayloads fetches MEV delivered payloads for a given slot, wrapped per relay.
func (b *BeaconSlots) getMevDeliveredPayloads(ctx context.Context, networkName string, slot phase0.Slot, slotStartTime time.Time) (map[string]*pb.DeliveredPayloads, error) {
	ch, err := b.xatuClient.GetClickhouseClientForNetwork(networkName)
	if err != nil {
		return nil, fmt.Errorf("failed to get ClickHouse client for network %s: %w", networkName, err)
	}

	// Calculate time window with 3-minute margin
	startTimeStr := slotStartTime.Add(-3 * time.Minute).Format("2006-01-02 15:04:05")
	endTimeStr := slotStartTime.Add(3 * time.Minute).Format("2006-01-02 15:04:05")

	query := `
		SELECT
			relay_name,
			slot,
			block_hash,
			block_number,
			proposer_pubkey,
			proposer_fee_recipient,
			gas_limit,
			gas_used,
			num_tx
		FROM default.mev_relay_proposer_payload_delivered
		WHERE slot = ? AND meta_network_name = ?
		AND slot_start_date_time BETWEEN ? AND ?
		GROUP BY 
			relay_name, 
			slot, 
			block_hash, 
			block_number, 
			proposer_pubkey, 
			proposer_fee_recipient, 
			gas_limit, 
			gas_used, 
			num_tx
		ORDER BY relay_name;
	`

	result, err := ch.Query(ctx, query, slot, networkName, startTimeStr, endTimeStr)
	if err != nil {
		if err.Error() == ErrNoRowsReturned { // Check specific error string
			log.WithFields(log.Fields{
				"slot":    slot,
				"network": networkName,
			}).Debug("No MEV delivered payloads found for slot")

			return make(map[string]*pb.DeliveredPayloads), nil // Return empty map of the correct type
		}

		return nil, fmt.Errorf("failed to query MEV delivered payloads: %w", err)
	}

	// Use the wrapper type for the result map
	deliveredPayloadsMap := make(map[string]*pb.DeliveredPayloads)

	for _, row := range result {
		// Safely parse fields
		relayName := fmt.Sprintf("%v", row["relay_name"])

		rowSlot, err := strconv.ParseUint(fmt.Sprintf("%v", row["slot"]), 10, 64)
		if err != nil {
			log.WithError(err).WithFields(log.Fields{"slot": slot, "network": networkName, "relay": relayName, "field": "slot", "value": row["slot"]}).Warn("Failed to parse delivered payload slot")

			continue
		}

		blockHash := fmt.Sprintf("%v", row["block_hash"])

		blockNumber, err := strconv.ParseUint(fmt.Sprintf("%v", row["block_number"]), 10, 64)
		if err != nil {
			log.WithError(err).WithFields(log.Fields{"slot": slot, "network": networkName, "relay": relayName, "field": "block_number", "value": row["block_number"]}).Warn("Failed to parse delivered payload block_number")

			continue
		}

		proposerPubkey := fmt.Sprintf("%v", row["proposer_pubkey"])

		proposerFeeRecipient := fmt.Sprintf("%v", row["proposer_fee_recipient"])

		payload := &pb.DeliveredPayload{
			Slot:                 rowSlot,
			BlockHash:            blockHash,
			BlockNumber:          blockNumber,
			ProposerPubkey:       proposerPubkey,
			ProposerFeeRecipient: proposerFeeRecipient,
		}

		// Get or create the wrapper for the current relay
		wrapper, exists := deliveredPayloadsMap[relayName]
		if !exists {
			wrapper = &pb.DeliveredPayloads{Payloads: make([]*pb.DeliveredPayload, 0)}
			deliveredPayloadsMap[relayName] = wrapper
		}

		// Append the payload to the wrapper's list
		wrapper.Payloads = append(wrapper.Payloads, payload)
	}

	return deliveredPayloadsMap, nil
}
