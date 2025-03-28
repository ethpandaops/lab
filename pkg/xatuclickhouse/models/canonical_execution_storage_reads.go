// Package models contains auto-generated Go structs for Xatu ClickHouse tables.
// DO NOT EDIT - Generated by generate_xatu_clickhouse_models.sh
package models

import (
    "time"
)

// CanonicalExecutionStorageReads represents a row from the canonical_execution_storage_reads table.
type CanonicalExecutionStorageReads struct {
    UpdatedDateTime    time.Time    `db:"updated_date_time" json:"updated_date_time"`
    BlockNumber    uint32    `db:"block_number" json:"block_number"`
    TransactionIndex    uint32    `db:"transaction_index" json:"transaction_index"`
    TransactionHash    string    `db:"transaction_hash" json:"transaction_hash"`
    InternalIndex    uint32    `db:"internal_index" json:"internal_index"`
    ContractAddress    string    `db:"contract_address" json:"contract_address"`
    Slot    string    `db:"slot" json:"slot"`
    Value    string    `db:"value" json:"value"`
    MetaNetworkId    int32    `db:"meta_network_id" json:"meta_network_id"`
    MetaNetworkName    string    `db:"meta_network_name" json:"meta_network_name"`
}

// TableName returns the table name for CanonicalExecutionStorageReads.
func (m *CanonicalExecutionStorageReads) TableName() string {
    return "canonical_execution_storage_reads"
}

// CanonicalExecutionStorageReadsParams represents query parameters for the canonical_execution_storage_reads table.
type CanonicalExecutionStorageReadsParams struct {
    // Common query parameters
    Limit  *uint64
    Offset *uint64

    // Table-specific parameters based on columns
    // Add specific query parameters here as needed
}
