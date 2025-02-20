export interface SlotData {
  // Basic slot info
  slot: number;
  network: string;
  processed_at: string; // ISO timestamp
  processing_time_ms: number;
  
  // Block information
  block: {
    slot: number;
    slot_start_date_time: string; // ISO timestamp
    epoch: number;
    epoch_start_date_time: string; // ISO timestamp
    block_root: string;
    block_version: string;
    block_total_bytes?: number;
    block_total_bytes_compressed?: number;
    parent_root: string;
    state_root: string;
    proposer_index: number;
    
    // Execution payload data
    eth1_data_block_hash: string;
    eth1_data_deposit_root: string;
    execution_payload_block_hash: string;
    execution_payload_block_number: number;
    execution_payload_fee_recipient: string;
    execution_payload_base_fee_per_gas?: number;
    execution_payload_blob_gas_used?: number;
    execution_payload_excess_blob_gas?: number;
    execution_payload_gas_limit?: number;
    execution_payload_gas_used?: number;
    execution_payload_state_root: string;
    execution_payload_parent_hash: string;
    execution_payload_transactions_count?: number;
    execution_payload_transactions_total_bytes?: number;
    execution_payload_transactions_total_bytes_compressed?: number;
  };

  // Proposer information
  proposer: {
    slot: number;
    proposer_pubkey: string;
    proposer_validator_index: number;
  };
  entity?: string; // Entity that proposed the block

  // Node information
  nodes: {
    [clientName: string]: {
      name: string;
      username: string; // Extracted from name (e.g., "ethpandaops" or second part of name)
      geo: {
        city: string;
        country: string;
        continent: string;
      };
    };
  };

  // Timing data
  timings: {
    // When nodes first saw the block via API
    block_seen: {
      [clientName: string]: number; // milliseconds from slot start
    };
    // When nodes first saw blobs via API
    blob_seen: {
      [clientName: string]: {
        [blobIndex: number]: number; // milliseconds from slot start
      };
    };
    // When nodes first saw the block via P2P
    block_first_seen_p2p: {
      [clientName: string]: number; // milliseconds from slot start
    };
    // When nodes first saw blobs via P2P
    blob_first_seen_p2p: {
      [clientName: string]: {
        [blobIndex: number]: number; // milliseconds from slot start
      };
    };
  };

  // Attestation data
  attestations: {
    windows: Array<{
      start_ms: number;  // Window start (ms from slot start)
      end_ms: number;    // Window end (ms from slot start)
      validator_indices: number[];  // Validators that attested in this window
    }>;
    maximum_votes: number;  // Maximum possible attestation votes for this slot
  };
}

export interface Config {
  modules: {
    [key: string]: any;
  };
  ethereum?: {
    networks: {
      [key: string]: {
        config_url: string;
        genesis_time: number;
      };
    };
  };
} 