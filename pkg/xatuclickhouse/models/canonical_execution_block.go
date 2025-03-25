// Package models contains auto-generated Go structs for Xatu ClickHouse tables.
// DO NOT EDIT - Generated by generate_xatu_clickhouse_models.sh
package models

import (
    "time"
)

// CanonicalExecutionBlock represents a row from the canonical_execution_block table.
type CanonicalExecutionBlock struct {
    UpdatedDateTime    time.Time    `db:"updated_date_time" json:"updated_date_time"`
    BlockDateTime    time.Time    `db:"block_date_time" json:"block_date_time"`
    BlockNumber    uint64    `db:"block_number" json:"block_number"`
    BlockHash    string    `db:"block_hash" json:"block_hash"`
    Author    *string    `db:"author" json:"author"`
    GasUsed    *string    `db:"gas_used" json:"gas_used"`
    ExtraData    *string    `db:"extra_data" json:"extra_data"`
    ExtraDataString    *string    `db:"extra_data_string" json:"extra_data_string"`
    BaseFeePerGas    *string    `db:"base_fee_per_gas" json:"base_fee_per_gas"`
    MetaNetworkId    int32    `db:"meta_network_id" json:"meta_network_id"`
    MetaNetworkName    string    `db:"meta_network_name" json:"meta_network_name"`
}

// TableName returns the table name for CanonicalExecutionBlock.
func (m *CanonicalExecutionBlock) TableName() string {
    return "canonical_execution_block"
}

// CanonicalExecutionBlockParams represents query parameters for the canonical_execution_block table.
type CanonicalExecutionBlockParams struct {
    // Common query parameters
    Limit  *uint64
    Offset *uint64

    // Table-specific parameters based on columns
    // Add specific query parameters here as needed
}
