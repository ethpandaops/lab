// Package models contains auto-generated Go structs for Xatu ClickHouse tables.
// DO NOT EDIT - Generated by generate_xatu_clickhouse_models.sh
package models

import (
    "time"
)

// BeaconApiEthV2BeaconBlock represents a row from the beacon_api_eth_v2_beacon_block table.
type BeaconApiEthV2BeaconBlock struct {
    UpdatedDateTime    time.Time    `db:"updated_date_time" json:"updated_date_time"`
    EventDateTime    time.Time    `db:"event_date_time" json:"event_date_time"`
    Slot    uint32    `db:"slot" json:"slot"`
    SlotStartDateTime    time.Time    `db:"slot_start_date_time" json:"slot_start_date_time"`
    Epoch    uint32    `db:"epoch" json:"epoch"`
    EpochStartDateTime    time.Time    `db:"epoch_start_date_time" json:"epoch_start_date_time"`
    BlockRoot    string    `db:"block_root" json:"block_root"`
    BlockVersion    string    `db:"block_version" json:"block_version"`
    BlockTotalBytes    *string    `db:"block_total_bytes" json:"block_total_bytes"`
    BlockTotalBytesCompressed    *string    `db:"block_total_bytes_compressed" json:"block_total_bytes_compressed"`
    ParentRoot    string    `db:"parent_root" json:"parent_root"`
    StateRoot    string    `db:"state_root" json:"state_root"`
    ProposerIndex    uint32    `db:"proposer_index" json:"proposer_index"`
    Eth1DataBlockHash    string    `db:"eth1_data_block_hash" json:"eth1_data_block_hash"`
    Eth1DataDepositRoot    string    `db:"eth1_data_deposit_root" json:"eth1_data_deposit_root"`
    ExecutionPayloadBlockHash    string    `db:"execution_payload_block_hash" json:"execution_payload_block_hash"`
    ExecutionPayloadBlockNumber    uint32    `db:"execution_payload_block_number" json:"execution_payload_block_number"`
    ExecutionPayloadFeeRecipient    string    `db:"execution_payload_fee_recipient" json:"execution_payload_fee_recipient"`
    ExecutionPayloadBaseFeePerGas    *string    `db:"execution_payload_base_fee_per_gas" json:"execution_payload_base_fee_per_gas"`
    ExecutionPayloadBlobGasUsed    *string    `db:"execution_payload_blob_gas_used" json:"execution_payload_blob_gas_used"`
    ExecutionPayloadExcessBlobGas    *string    `db:"execution_payload_excess_blob_gas" json:"execution_payload_excess_blob_gas"`
    ExecutionPayloadGasLimit    *string    `db:"execution_payload_gas_limit" json:"execution_payload_gas_limit"`
    ExecutionPayloadGasUsed    *string    `db:"execution_payload_gas_used" json:"execution_payload_gas_used"`
    ExecutionPayloadStateRoot    string    `db:"execution_payload_state_root" json:"execution_payload_state_root"`
    ExecutionPayloadParentHash    string    `db:"execution_payload_parent_hash" json:"execution_payload_parent_hash"`
    ExecutionPayloadTransactionsCount    *string    `db:"execution_payload_transactions_count" json:"execution_payload_transactions_count"`
    ExecutionPayloadTransactionsTotalBytes    *string    `db:"execution_payload_transactions_total_bytes" json:"execution_payload_transactions_total_bytes"`
    ExecutionPayloadTransactionsTotalBytesCompressed    *string    `db:"execution_payload_transactions_total_bytes_compressed" json:"execution_payload_transactions_total_bytes_compressed"`
    MetaClientName    string    `db:"meta_client_name" json:"meta_client_name"`
    MetaClientId    string    `db:"meta_client_id" json:"meta_client_id"`
    MetaClientVersion    string    `db:"meta_client_version" json:"meta_client_version"`
    MetaClientImplementation    string    `db:"meta_client_implementation" json:"meta_client_implementation"`
    MetaClientOs    string    `db:"meta_client_os" json:"meta_client_os"`
    MetaClientIp    *string    `db:"meta_client_ip" json:"meta_client_ip"`
    MetaClientGeoCity    string    `db:"meta_client_geo_city" json:"meta_client_geo_city"`
    MetaClientGeoCountry    string    `db:"meta_client_geo_country" json:"meta_client_geo_country"`
    MetaClientGeoCountryCode    string    `db:"meta_client_geo_country_code" json:"meta_client_geo_country_code"`
    MetaClientGeoContinentCode    string    `db:"meta_client_geo_continent_code" json:"meta_client_geo_continent_code"`
    MetaClientGeoLongitude    *string    `db:"meta_client_geo_longitude" json:"meta_client_geo_longitude"`
    MetaClientGeoLatitude    *string    `db:"meta_client_geo_latitude" json:"meta_client_geo_latitude"`
    MetaClientGeoAutonomousSystemNumber    *string    `db:"meta_client_geo_autonomous_system_number" json:"meta_client_geo_autonomous_system_number"`
    MetaClientGeoAutonomousSystemOrganization    *string    `db:"meta_client_geo_autonomous_system_organization" json:"meta_client_geo_autonomous_system_organization"`
    MetaNetworkId    int32    `db:"meta_network_id" json:"meta_network_id"`
    MetaNetworkName    string    `db:"meta_network_name" json:"meta_network_name"`
    MetaConsensusVersion    string    `db:"meta_consensus_version" json:"meta_consensus_version"`
    MetaConsensusVersionMajor    string    `db:"meta_consensus_version_major" json:"meta_consensus_version_major"`
    MetaConsensusVersionMinor    string    `db:"meta_consensus_version_minor" json:"meta_consensus_version_minor"`
    MetaConsensusVersionPatch    string    `db:"meta_consensus_version_patch" json:"meta_consensus_version_patch"`
    MetaConsensusImplementation    string    `db:"meta_consensus_implementation" json:"meta_consensus_implementation"`
    MetaLabels    map[string]string    `db:"meta_labels" json:"meta_labels"`
}

// TableName returns the table name for BeaconApiEthV2BeaconBlock.
func (m *BeaconApiEthV2BeaconBlock) TableName() string {
    return "beacon_api_eth_v2_beacon_block"
}

// BeaconApiEthV2BeaconBlockParams represents query parameters for the beacon_api_eth_v2_beacon_block table.
type BeaconApiEthV2BeaconBlockParams struct {
    // Common query parameters
    Limit  *uint64
    Offset *uint64

    // Table-specific parameters based on columns
    // Add specific query parameters here as needed
}
