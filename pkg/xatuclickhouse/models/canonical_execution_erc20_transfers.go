// Package models contains auto-generated Go structs for Xatu ClickHouse tables.
// DO NOT EDIT - Generated by generate_xatu_clickhouse_models.sh
package models

import (
    "time"
)

// CanonicalExecutionErc20Transfers represents a row from the canonical_execution_erc20_transfers table.
type CanonicalExecutionErc20Transfers struct {
    UpdatedDateTime    time.Time    `db:"updated_date_time" json:"updated_date_time"`
    BlockNumber    uint64    `db:"block_number" json:"block_number"`
    TransactionIndex    uint64    `db:"transaction_index" json:"transaction_index"`
    TransactionHash    string    `db:"transaction_hash" json:"transaction_hash"`
    InternalIndex    uint32    `db:"internal_index" json:"internal_index"`
    LogIndex    uint64    `db:"log_index" json:"log_index"`
    Erc20    string    `db:"erc20" json:"erc20"`
    FromAddress    string    `db:"from_address" json:"from_address"`
    ToAddress    string    `db:"to_address" json:"to_address"`
    Value    string    `db:"value" json:"value"`
    MetaNetworkId    int32    `db:"meta_network_id" json:"meta_network_id"`
    MetaNetworkName    string    `db:"meta_network_name" json:"meta_network_name"`
}

// TableName returns the table name for CanonicalExecutionErc20Transfers.
func (m *CanonicalExecutionErc20Transfers) TableName() string {
    return "canonical_execution_erc20_transfers"
}

// CanonicalExecutionErc20TransfersParams represents query parameters for the canonical_execution_erc20_transfers table.
type CanonicalExecutionErc20TransfersParams struct {
    // Common query parameters
    Limit  *uint64
    Offset *uint64

    // Table-specific parameters based on columns
    // Add specific query parameters here as needed
}
