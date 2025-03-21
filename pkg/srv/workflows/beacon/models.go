package beacon

import (
	"encoding/json"
	"time"
)

// SlotProcessorState represents the state of the slot processor
type SlotProcessorState struct {
	TargetSlot        *int64 `json:"target_slot"`
	CurrentSlot       *int64 `json:"current_slot"`
	Direction         string `json:"direction"` // "forward" or "backward"
	LastProcessedSlot *int64 `json:"last_processed_slot"`
}

// ProposerData represents data about the slot proposer
type ProposerData struct {
	Slot                   int64 `json:"slot"`
	ProposerValidatorIndex int64 `json:"proposer_validator_index"`
}

// BlockData represents data about an Ethereum beacon chain block
type BlockData struct {
	Slot                                             int64     `json:"slot"`
	SlotStartDateTime                                time.Time `json:"slot_start_date_time"`
	Epoch                                            int64     `json:"epoch"`
	EpochStartDateTime                               time.Time `json:"epoch_start_date_time"`
	BlockRoot                                        string    `json:"block_root"`
	BlockVersion                                     string    `json:"block_version"`
	BlockTotalBytes                                  *int64    `json:"block_total_bytes"`
	BlockTotalBytesCompressed                        *int64    `json:"block_total_bytes_compressed"`
	ParentRoot                                       string    `json:"parent_root"`
	StateRoot                                        string    `json:"state_root"`
	ProposerIndex                                    int64     `json:"proposer_index"`
	Eth1DataBlockHash                                string    `json:"eth1_data_block_hash"`
	Eth1DataDepositRoot                              string    `json:"eth1_data_deposit_root"`
	ExecutionPayloadBlockHash                        string    `json:"execution_payload_block_hash"`
	ExecutionPayloadBlockNumber                      int64     `json:"execution_payload_block_number"`
	ExecutionPayloadFeeRecipient                     string    `json:"execution_payload_fee_recipient"`
	ExecutionPayloadBaseFeePerGas                    *int64    `json:"execution_payload_base_fee_per_gas"`
	ExecutionPayloadBlobGasUsed                      *int64    `json:"execution_payload_blob_gas_used"`
	ExecutionPayloadExcessBlobGas                    *int64    `json:"execution_payload_excess_blob_gas"`
	ExecutionPayloadGasLimit                         *int64    `json:"execution_payload_gas_limit"`
	ExecutionPayloadGasUsed                          *int64    `json:"execution_payload_gas_used"`
	ExecutionPayloadStateRoot                        string    `json:"execution_payload_state_root"`
	ExecutionPayloadParentHash                       string    `json:"execution_payload_parent_hash"`
	ExecutionPayloadTransactionsCount                *int64    `json:"execution_payload_transactions_count"`
	ExecutionPayloadTransactionsTotalBytes           *int64    `json:"execution_payload_transactions_total_bytes"`
	ExecutionPayloadTransactionsTotalBytesCompressed *int64    `json:"execution_payload_transactions_total_bytes_compressed"`
}

// SeenAtSlotTimeData represents timing data for when a block was seen
type SeenAtSlotTimeData struct {
	SlotTimeMs             int64  `json:"slot_time_ms"`
	MetaClientName         string `json:"meta_client_name"`
	MetaClientGeoCity      string `json:"meta_client_geo_city"`
	MetaClientGeoCountry   string `json:"meta_client_geo_country"`
	MetaClientGeoContinent string `json:"meta_client_geo_continent_code"`
}

// BlobSeenAtSlotTimeData represents timing data for when a blob was seen
type BlobSeenAtSlotTimeData struct {
	SlotTimeMs             int64  `json:"slot_time_ms"`
	BlobIndex              int64  `json:"blob_index"`
	MetaClientName         string `json:"meta_client_name"`
	MetaClientGeoCity      string `json:"meta_client_geo_city"`
	MetaClientGeoCountry   string `json:"meta_client_geo_country"`
	MetaClientGeoContinent string `json:"meta_client_geo_continent_code"`
}

// Node represents a client with its geo data
type Node struct {
	Name             string   `json:"name"`
	Username         string   `json:"username"`
	GeoCity          string   `json:"geo_city"`
	GeoCountry       string   `json:"geo_country"`
	GeoContinentCode string   `json:"geo_continent_code"`
	GeoLatitude      *float64 `json:"geo_latitude,omitempty"`
	GeoLongitude     *float64 `json:"geo_longitude,omitempty"`
}

// AttestationWindow represents a window of attestations
type AttestationWindow struct {
	StartMs          int64   `json:"start_ms"`
	EndMs            int64   `json:"end_ms"`
	ValidatorIndices []int64 `json:"validator_indices"`
}

// OptimizedSlotData represents slot data optimized for storage
type OptimizedSlotData struct {
	Slot                    int64                      `json:"slot"`
	Network                 string                     `json:"network"`
	ProcessedAt             string                     `json:"processed_at"`
	ProcessingTimeMs        int64                      `json:"processing_time_ms"`
	Block                   map[string]interface{}     `json:"block"`
	Proposer                map[string]interface{}     `json:"proposer"`
	Entity                  *string                    `json:"entity,omitempty"`
	Nodes                   map[string]Node            `json:"nodes"`
	BlockSeenTimes          map[string]int64           `json:"block_seen_times"`
	BlobSeenTimes           map[string]map[int64]int64 `json:"blob_seen_times"`
	BlockFirstSeenP2PTimes  map[string]int64           `json:"block_first_seen_p2p_times"`
	BlobFirstSeenP2PTimes   map[string]map[int64]int64 `json:"blob_first_seen_p2p_times"`
	AttestationWindows      []AttestationWindow        `json:"attestation_windows"`
	MaximumAttestationVotes int64                      `json:"maximum_attestation_votes"`
}

// BacklogConfig represents configuration for backlog processing
type BacklogConfig struct {
	ForkName   *string    `json:"fork_name,omitempty"`
	TargetDate *time.Time `json:"target_date,omitempty"`
	TargetSlot *int64     `json:"target_slot,omitempty"`
}

// ToJSON converts a struct to a JSON string
func ToJSON(v interface{}) (string, error) {
	bytes, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// FromJSON converts a JSON string to a struct
func FromJSON(jsonStr string, v interface{}) error {
	return json.Unmarshal([]byte(jsonStr), v)
}
