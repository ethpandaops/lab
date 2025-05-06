import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch builder names from JSON file.
 * 
 * @param network - The network to fetch builder names for (e.g. 'mainnet')
 * @returns A map of builder pubkeys to builder names
 */
export function useBuilderNames(network: string): Record<string, string> {
  const [builderNames, setBuilderNames] = useState<Record<string, string>>({});
  
  useEffect(() => {
    async function fetchBuilderNames() {
      try {
        // Format the network name for the file path
        const formattedNetwork = network.toLowerCase();
        const response = await fetch(`/data/${formattedNetwork}-builders.json`);
        
        // If the file doesn't exist, just return an empty object
        if (!response.ok) {
          console.warn(`No builder names file found for ${formattedNetwork} network`);
          return;
        }
        
        const data = await response.json();
        
        // Invert the mapping - from names->pubkeys to pubkeys->names
        const pubkeyToName: Record<string, string> = {};
        
        Object.entries(data).forEach(([name, pubkey]) => {
          if (typeof pubkey === 'string') {
            // Normalize the pubkey for consistent lookup
            const normalizedPubkey = pubkey.toLowerCase().replace(/^0x/, '');
            pubkeyToName[normalizedPubkey] = name;
          }
        });
        
        setBuilderNames(pubkeyToName);
      } catch (error) {
        console.error('Error fetching builder names:', error);
      }
    }
    
    fetchBuilderNames();
  }, [network]);
  
  return builderNames;
}