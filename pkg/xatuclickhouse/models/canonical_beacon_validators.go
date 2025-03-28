// Package models contains auto-generated Go structs for Xatu ClickHouse tables.
// DO NOT EDIT - Generated by generate_xatu_clickhouse_models.sh
package models

import (
    "time"
)

// CanonicalBeaconValidators represents a row from the canonical_beacon_validators table.
type CanonicalBeaconValidators struct {
    UpdatedDateTime    time.Time    `db:"updated_date_time" json:"updated_date_time"`
    Epoch    uint32    `db:"epoch" json:"epoch"`
    EpochStartDateTime    time.Time    `db:"epoch_start_date_time" json:"epoch_start_date_time"`
    Index    uint32    `db:"index" json:"index"`
    Balance    *string    `db:"balance" json:"balance"`
    Status    string    `db:"status" json:"status"`
    EffectiveBalance    *string    `db:"effective_balance" json:"effective_balance"`
    Slashed    bool    `db:"slashed" json:"slashed"`
    ActivationEpoch    *string    `db:"activation_epoch" json:"activation_epoch"`
    ActivationEligibilityEpoch    *string    `db:"activation_eligibility_epoch" json:"activation_eligibility_epoch"`
    ExitEpoch    *string    `db:"exit_epoch" json:"exit_epoch"`
    WithdrawableEpoch    *string    `db:"withdrawable_epoch" json:"withdrawable_epoch"`
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

// TableName returns the table name for CanonicalBeaconValidators.
func (m *CanonicalBeaconValidators) TableName() string {
    return "canonical_beacon_validators"
}

// CanonicalBeaconValidatorsParams represents query parameters for the canonical_beacon_validators table.
type CanonicalBeaconValidatorsParams struct {
    // Common query parameters
    Limit  *uint64
    Offset *uint64

    // Table-specific parameters based on columns
    // Add specific query parameters here as needed
}
