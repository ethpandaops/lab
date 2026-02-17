import type { ContractOwnerMap } from '../hooks/useContractOwners';

/**
 * Map of EVM precompiled contract addresses to their human-readable names.
 * Addresses 0x01-0x0a are pre-Pectra, 0x0b-0x0e added in Pectra (EIP-2537).
 *
 * @see https://www.evm.codes/precompiled
 */
const PRECOMPILE_NAMES: Record<string, string> = {
  '0x0000000000000000000000000000000000000001': 'ecRecover',
  '0x0000000000000000000000000000000000000002': 'SHA2-256',
  '0x0000000000000000000000000000000000000003': 'RIPEMD-160',
  '0x0000000000000000000000000000000000000004': 'Identity',
  '0x0000000000000000000000000000000000000005': 'ModExp',
  '0x0000000000000000000000000000000000000006': 'ecAdd',
  '0x0000000000000000000000000000000000000007': 'ecMul',
  '0x0000000000000000000000000000000000000008': 'ecPairing',
  '0x0000000000000000000000000000000000000009': 'BLAKE2f',
  '0x000000000000000000000000000000000000000a': 'KZG Point Eval',
  '0x000000000000000000000000000000000000000b': 'BLS12-381 G1Add',
  '0x000000000000000000000000000000000000000c': 'BLS12-381 G1MSM',
  '0x000000000000000000000000000000000000000d': 'BLS12-381 G2Add',
  '0x000000000000000000000000000000000000000e': 'BLS12-381 G2MSM',
};

/**
 * Returns a ContractOwnerMap containing precompile addresses with their names.
 * Merge this with the API-sourced contractOwners map (API results take priority).
 */
export function getPrecompileOwnerMap(): ContractOwnerMap {
  const map: ContractOwnerMap = {};
  for (const [address, name] of Object.entries(PRECOMPILE_NAMES)) {
    map[address] = { contract_address: address, contract_name: name };
  }
  return map;
}

/**
 * Check if an address is a known precompiled contract.
 */
export function isPrecompileAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  return address.toLowerCase() in PRECOMPILE_NAMES;
}

/**
 * Get the human-readable name for a precompile address, or null if not a precompile.
 */
export function getPrecompileName(address: string | null | undefined): string | null {
  if (!address) return null;
  return PRECOMPILE_NAMES[address.toLowerCase()] ?? null;
}
