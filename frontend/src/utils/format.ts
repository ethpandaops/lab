import { protoInt64 } from '@bufbuild/protobuf';

export function formatEntityName(name: string): { name: string; type?: string } {
  if (!name) return { name: 'Unknown' };

  // Handle CSM operators
  if (name.startsWith('csm_operator')) {
    const operatorNumber = name.match(/operator(\d+)/)?.[1];
    return {
      name: `Operator ${operatorNumber}`,
      type: 'Lido CSM',
    };
  }

  // Handle Lido operators
  if (name.endsWith('_lido')) {
    const baseName = name.replace('_lido', '');
    return {
      name: formatBaseName(baseName),
      type: 'Lido',
    };
  }

  // Handle whales
  if (name.startsWith('whale_')) {
    const address = name.replace('whale_', '');
    return {
      name: address,
      type: 'Whale',
    };
  }

  // Handle .eth addresses
  if (name.endsWith('.eth')) {
    return { name };
  }

  // Handle everything else
  return { name: formatBaseName(name) };
}

function formatBaseName(name: string): string {
  return (
    name
      // Split on underscores and dots
      .split(/[._]/)
      // Capitalize each word
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      // Join with spaces
      .join(' ')
  );
}

export function formatEntity(name: string): string {
  const { name: formattedName, type } = formatEntityName(name);
  if (!type) return formattedName;
  return `${formattedName} (${type})`;
}

/**
 * Formats a node name into user and node components
 * If the name contains 'ethpandaops', user will be 'ethpandaops'
 * Otherwise, user will be the part between first and second forward slashes
 * Node name will always be the last part after the last forward slash
 */
export function formatNodeName(fullName: string): { user: string; node: string } {
  const parts = fullName.split('/');
  if (parts.length < 3) return { user: fullName, node: fullName };

  // Always use the last part as the node name
  const nodeName = parts[parts.length - 1];

  // If it contains ethpandaops anywhere, set user to ethpandaops
  if (fullName.includes('ethpandaops')) {
    return {
      user: 'ethpandaops',
      node: nodeName,
    };
  }

  // Otherwise get the username from between first and second slash
  return {
    user: parts[1],
    node: nodeName,
  };
}

/**
 * Format a number of wei to ether
 */
export function formatEther(value: any): string {
  if (!value) return '0 ETH';

  let wei: bigint;

  // Handle various types that could be passed
  if (typeof value === 'bigint') {
    wei = value;
  } else if (typeof value === 'number') {
    wei = BigInt(value);
  } else if (typeof value === 'string') {
    wei = BigInt(value);
  } else {
    // Handle proto int64
    try {
      const numStr = value.toString();
      wei = BigInt(numStr);
    } catch (e) {
      return '0 ETH';
    }
  }

  const ether = Number(wei) / 1e18;

  if (ether < 0.000001) {
    return '< 0.000001 ETH';
  }

  return `${ether.toFixed(6)} ETH`;
}

/**
 * Format bytes to human readable format
 */
export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format gas to ether equivalent
 */
export function formatGasToEther(gas: number, gasPrice: number): string {
  if (gas === 0 || gasPrice === 0) return '0 ETH';

  const wei = BigInt(gas) * BigInt(gasPrice);
  const ether = Number(wei) / 1e18;

  return `${ether.toFixed(6)} ETH`;
}

/**
 * Format a timestamp to a human readable string
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Format a duration in milliseconds to a human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(2)}s`;
  }

  const minutes = seconds / 60;
  return `${minutes.toFixed(2)}min`;
}
