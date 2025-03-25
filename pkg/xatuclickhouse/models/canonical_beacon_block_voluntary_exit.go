// Package models contains auto-generated Go structs for Xatu ClickHouse tables.
// DO NOT EDIT - Generated by generate_xatu_clickhouse_models.sh
package models

import (
    "time"
)

// CanonicalBeaconBlockVoluntaryExit represents a row from the canonical_beacon_block_voluntary_exit table.
type CanonicalBeaconBlockVoluntaryExit struct {
    UpdatedDateTime    time.Time    `db:"updated_date_time" json:"updated_date_time"`
    Slot    uint32    `db:"slot" json:"slot"`
    SlotStartDateTime    time.Time    `db:"slot_start_date_time" json:"slot_start_date_time"`
    Epoch    uint32    `db:"epoch" json:"epoch"`
    EpochStartDateTime    time.Time    `db:"epoch_start_date_time" json:"epoch_start_date_time"`
    BlockRoot    string    `db:"block_root" json:"block_root"`
    BlockVersion    string    `db:"block_version" json:"block_version"`
    VoluntaryExitMessageEpoch    uint32    `db:"voluntary_exit_message_epoch" json:"voluntary_exit_message_epoch"`
    VoluntaryExitMessageValidatorIndex    uint32    `db:"voluntary_exit_message_validator_index" json:"voluntary_exit_message_validator_index"`
    VoluntaryExitSignature    string    `db:"voluntary_exit_signature" json:"voluntary_exit_signature"`
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

// TableName returns the table name for CanonicalBeaconBlockVoluntaryExit.
func (m *CanonicalBeaconBlockVoluntaryExit) TableName() string {
    return "canonical_beacon_block_voluntary_exit"
}

// CanonicalBeaconBlockVoluntaryExitParams represents query parameters for the canonical_beacon_block_voluntary_exit table.
type CanonicalBeaconBlockVoluntaryExitParams struct {
    // Common query parameters
    Limit  *uint64
    Offset *uint64

    // Table-specific parameters based on columns
    // Add specific query parameters here as needed
}
