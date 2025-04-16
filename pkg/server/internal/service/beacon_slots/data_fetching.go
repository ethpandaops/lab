package beacon_slots

import (
	"context"
	"errors"
	"fmt"
	"strconv"

	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_slots"
)

// getProposerEntity gets entity for a given validator index
func (b *BeaconSlots) getProposerEntity(ctx context.Context, networkName string, index int64) (*string, error) {
	// This implementation is simplified - in the actual application,
	// we would need to check validator_entity lookup first

	// Query ClickHouse for the entity
	query := `
		SELECT
			entity
		FROM xatu.ethseer_validator_entity FINAL
		WHERE
			index = $1
			AND meta_network_name = $2
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
		return nil, fmt.Errorf("failed to get entity: %w", err)
	}

	if result == nil || result["entity"] == nil {
		return nil, nil // No entity found
	}

	entity := fmt.Sprintf("%v", result["entity"])
	return &entity, nil
}

// getBlockSeenAtSlotTime gets seen at slot time data for a given slot
func (b *BeaconSlots) getBlockSeenAtSlotTime(ctx context.Context, networkName string, slot int64) (map[string]*pb.BlockArrivalTime, error) {
	// Get start and end dates for the slot +- 15 minutes
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		WITH api_events AS (
			SELECT
				propagation_slot_start_diff as slot_time,
				meta_client_name
			FROM xatu.beacon_api_eth_v1_events_block FINAL
			WHERE
				slot = ?
				AND meta_network_name = ?
				AND slot_start_date_time BETWEEN ? AND ?
		),
		head_events AS (
			SELECT
				propagation_slot_start_diff as slot_time,
				meta_client_name
			FROM xatu.beacon_api_eth_v1_events_block FINAL
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
				ROW_NUMBER() OVER (PARTITION BY meta_client_name ORDER BY event_date_time ASC) as rn
			FROM combined_events
		) t
		WHERE rn = 1
		ORDER BY event_date_time ASC
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
func (b *BeaconSlots) getBlobSeenAtSlotTime(ctx context.Context, networkName string, slot int64) (map[string]*pb.BlobArrivalTimes, error) {
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
			FROM xatu.beacon_api_eth_v1_events_blob_sidecar FINAL
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
func (b *BeaconSlots) getBlockFirstSeenInP2PSlotTime(ctx context.Context, networkName string, slot int64) (map[string]*pb.BlockArrivalTime, error) {
	// Get start and end dates for the slot +- 15 minutes
	startTime, endTime := b.getSlotWindow(ctx, networkName, slot)

	// Convert to ClickHouse format
	startStr := startTime.Format("2006-01-02 15:04:05")
	endStr := endTime.Format("2006-01-02 15:04:05")

	query := `
		SELECT
			propagation_slot_start_diff as slot_time,
			meta_client_name
		FROM (
			SELECT *,
				ROW_NUMBER() OVER (PARTITION BY meta_client_name ORDER BY event_date_time ASC) as rn
			FROM xatu.libp2p_gossipsub_beacon_block FINAL
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
func (b *BeaconSlots) getBlobFirstSeenInP2PSlotTime(ctx context.Context, networkName string, slot int64) (map[string]*pb.BlobArrivalTimes, error) {
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
			FROM xatu.libp2p_gossipsub_blob_sidecar FINAL
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
func (b *BeaconSlots) getMaximumAttestationVotes(ctx context.Context, networkName string, slot int64) (int64, error) {
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
			FROM xatu.beacon_api_eth_v1_beacon_committee
			WHERE
				slot = $1
				AND network = $2
				AND slot_start_date_time BETWEEN $3 AND $4
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
func (b *BeaconSlots) getAttestationVotes(ctx context.Context, networkName string, slot int64, blockRoot string) (map[int64]int64, error) {
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
			FROM xatu.beacon_api_eth_v1_events_attestation
			WHERE
				slot = $1
				AND meta_network_name = $2
				AND slot_start_date_time BETWEEN $3 AND $4
				AND beacon_block_root = $5
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
