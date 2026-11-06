import { EXECUTION_CLIENTS } from '@/utils/ethereum';

/**
 * Execution client in a node name; fct_prepared_block has no execution client column. The consensus client comes
 * from meta_consensus_implementation, which names tysm nodes tysm where their names say prysm.
 *
 * Example node names:
 * - ethpandaops/mainnet/utility-mainnet-prysm-geth-tysm-001
 * - ethpandaops/mainnet/sentry-mainnet-lighthouse-nethermind-001
 *
 * @param clientName - The full node name (meta_client_name)
 * @returns The execution client, or null if the name has none
 */
export function parseExecutionClient(clientName: string | undefined): string | null {
  if (!clientName) return null;
  const lowerName = clientName.toLowerCase();
  return EXECUTION_CLIENTS.find(client => lowerName.includes(client)) ?? null;
}
