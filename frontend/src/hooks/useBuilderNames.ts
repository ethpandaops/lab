import { useState, useEffect } from 'react';

// Global cache to avoid duplicate fetches across components
const builderNamesCache: Record<string, Record<string, string>> = {};
// Track ongoing fetch requests to prevent duplicates
const pendingFetches: Record<string, Promise<Record<string, string>>> = {};

/**
 * Custom hook to fetch builder names from JSON file.
 * Implements a global cache to prevent multiple requests.
 * 
 * @param network - The network to fetch builder names for (e.g. 'mainnet')
 * @returns A map of builder pubkeys to builder names
 */
export function useBuilderNames(network: string): Record<string, string> {
  const [builderNames, setBuilderNames] = useState<Record<string, string>>(
    // Initialize from cache if available
    builderNamesCache[network.toLowerCase()] || {}
  );
  
  useEffect(() => {
    const formattedNetwork = network.toLowerCase();
    
    // Return immediately if data is already in cache
    if (builderNamesCache[formattedNetwork]) {
      return;
    }
    
    // Create a function to fetch builder names that can be shared
    async function fetchAndProcessBuilderNames(): Promise<Record<string, string>> {
      try {
        console.log(`Actual fetch for ${formattedNetwork}-builders.json started`);
        const response = await fetch(`/data/${formattedNetwork}-builders.json`);
        
        // If file doesn't exist, return empty object
        if (!response.ok) {
          console.warn(`Fetch failed for ${formattedNetwork}-builders.json:`, response.status, response.statusText);
          return {};
        }
        
        const text = await response.text();
        console.log(`Got JSON data (${text.length} bytes):`, text.substring(0, 100) + '...');
        
        let data;
        try {
          data = JSON.parse(text);
        } catch (jsonError) {
          console.error('JSON parse error:', jsonError);
          return {};
        }
        
        // Process the data - invert the mapping
        const pubkeyToName: Record<string, string> = {};
        
        console.log('Processing builder data:', Object.keys(data));
        
        Object.entries(data).forEach(([name, pubkey]) => {
          if (typeof pubkey === 'string') {
            // Normalize the pubkey for consistent lookup
            const normalizedPubkey = pubkey.toLowerCase().replace(/^0x/, '');
            console.log(`Mapped ${name} -> ${normalizedPubkey.substring(0, 12)}...`);
            pubkeyToName[normalizedPubkey] = name;
          } else {
            console.warn(`Skipping invalid pubkey for ${name}:`, pubkey);
          }
        });
        
        // Cache the results
        builderNamesCache[formattedNetwork] = pubkeyToName;
        
        return pubkeyToName;
      } catch (error) {
        console.error('Error fetching builder names:', error);
        return {}; // Return empty object on error
      } finally {
        // Clear this pending fetch
        delete pendingFetches[formattedNetwork];
      }
    }
    
    // If there's an existing fetch, use it, otherwise create a new one
    const fetchPromise = pendingFetches[formattedNetwork] || 
      (pendingFetches[formattedNetwork] = fetchAndProcessBuilderNames());
    
    // Use the fetch promise
    fetchPromise.then(names => {
      setBuilderNames(names);
    });
    
    // No cleanup needed since the cache is global
  }, [network]);
  
  return builderNames;
}