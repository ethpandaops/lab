/** Returns the base Etherscan URL for a given network name. */
export function getEtherscanBaseUrl(networkName?: string | null): string {
  switch (networkName) {
    case 'hoodi':
      return 'https://hoodi.etherscan.io';
    case 'sepolia':
      return 'https://sepolia.etherscan.io';
    default:
      return 'https://etherscan.io';
  }
}

/** Returns whether Tenderly and Phalcon links should be shown (mainnet only). */
export function isMainnet(networkName?: string | null): boolean {
  return !networkName || networkName === 'mainnet';
}
