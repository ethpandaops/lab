export const EXECUTION_CLIENTS = ['geth', 'reth', 'erigon', 'besu', 'nethermind'];

export const CONSENSUS_CLIENTS = ['lighthouse', 'prysm', 'nimbus', 'lodestar', 'teku', 'grandine'];

export type ExecutionClient = (typeof EXECUTION_CLIENTS)[number];
export type ConsensusClient = (typeof CONSENSUS_CLIENTS)[number];
