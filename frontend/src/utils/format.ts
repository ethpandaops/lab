export function formatEntityName(name: string): { name: string; type?: string } {
  if (!name) return { name: 'Unknown' };

  // Handle CSM operators
  if (name.startsWith('csm_operator')) {
    const operatorNumber = name.match(/operator(\d+)/)?.[1];
    return {
      name: `Operator ${operatorNumber}`,
      type: 'Lido CSM'
    };
  }

  // Handle Lido operators
  if (name.endsWith('_lido')) {
    const baseName = name.replace('_lido', '');
    return {
      name: formatBaseName(baseName),
      type: 'Lido'
    };
  }

  // Handle whales
  if (name.startsWith('whale_')) {
    const address = name.replace('whale_', '');
    return {
      name: address,
      type: 'Whale'
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
  return name
    // Split on underscores and dots
    .split(/[._]/)
    // Capitalize each word
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    // Join with spaces
    .join(' ');
}

export function formatEntity(name: string): string {
  const { name: formattedName, type } = formatEntityName(name);
  if (!type) return formattedName;
  return `${formattedName} (${type})`;
} 