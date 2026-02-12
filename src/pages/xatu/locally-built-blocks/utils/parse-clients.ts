import { CONSENSUS_CLIENTS, EXECUTION_CLIENTS } from '@/utils/ethereum';

/**
 * Parse the meta_client_name to extract execution and consensus client names
 *
 * Example node names:
 * - ethpandaops/mainnet/utility-mainnet-prysm-geth-tysm-001
 * - ethpandaops/mainnet/sentry-mainnet-lighthouse-nethermind-001
 *
 * @param clientName - The full node name (meta_client_name)
 * @returns Object with executionClient and consensusClient, or null if not found
 */
export function parseClientName(clientName: string | undefined): {
  executionClient: string | null;
  consensusClient: string | null;
} {
  if (!clientName) {
    return { executionClient: null, consensusClient: null };
  }

  const lowerName = clientName.toLowerCase();
  let executionClient: string | null = null;
  let consensusClient: string | null = null;

  // Find execution client in the name
  for (const client of EXECUTION_CLIENTS) {
    if (lowerName.includes(client)) {
      executionClient = client;
      break;
    }
  }

  // Find consensus client in the name
  for (const client of CONSENSUS_CLIENTS) {
    if (lowerName.includes(client)) {
      consensusClient = client;
      break;
    }
  }

  return { executionClient, consensusClient };
}
