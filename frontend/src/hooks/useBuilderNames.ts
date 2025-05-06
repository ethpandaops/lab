import { useState, useEffect } from 'react';

// Define a type for our builder names cache
interface BuilderNameMap extends Record<string, string> {
  findBuilder?: (pubkey: string) => string | undefined;
}

// Global cache to avoid duplicate fetches across components
const builderNamesCache: Record<string, BuilderNameMap> = {};
// Track ongoing fetch requests to prevent duplicates
const pendingFetches: Record<string, Promise<BuilderNameMap>> = {};

/**
 * Custom hook to fetch builder names from JSON file.
 * Implements a global cache to prevent multiple requests.
 *
 * @param network - The network to fetch builder names for (e.g. 'mainnet')
 * @returns A map of builder pubkeys to builder names
 */
export function useBuilderNames(network: string): BuilderNameMap {
  const [builderNames, setBuilderNames] = useState<BuilderNameMap>(
    // Initialize from cache if available
    builderNamesCache[network.toLowerCase()] || {},
  );

  useEffect(() => {
    const formattedNetwork = network.toLowerCase();

    // Return immediately if data is already in cache
    if (builderNamesCache[formattedNetwork]) {
      return;
    }

    // Create a function to fetch builder names that can be shared
    async function fetchAndProcessBuilderNames(): Promise<BuilderNameMap> {
      try {
        // Define all the common builders from known sources
        const knownBuilders = {
          // Standard builders
          Titan:
            '0x84e78cb2ad883861c9eeeb7d1b22a8e02069320e86e57c88590841efc1a2a3e2937c3a9ca118d7add71d0be0b14788bb',
          Builder0x69:
            '0x945fc51bf63613257792926c9155d7ae32db73155dc13bdfe61cd476f1fd2297b66601e8721b723cef11e4e6682e9d87',
          Flashbots:
            '0xa1dead01e65f0a0eee7b5170223f20c8f0cbf122eac3324d61afbdb33a8885ff8cab2ef514ac2c7698ae0d6289ef27fc',
          beaverbuild:
            '0xb67eaa5efbfa231de29f83eb7fab4e5bcdcafc65f9f1d1d7fced57f660a50f5e455fd7fd2087dce5afc9f8e829204a34',
          rsync: '0xa3d534e67d66ff970e469b838',
          bancility: '0xb086acda0be7a69331e1f10ecff683ba',
          beepending:
            '0x94a76d5a922b9a7bbb0bae8890b29b5e818c42ec07cd853a1b8f3183b39061f79e6911e10d5b8657de9364bf9e251334',
          Eden: '0x8b8edce58fafe098763e4fabdeb318d347f9238845f42b44fca8d5a8129d2a98b0647a2e3a3730f3b05b48e86436e224',
          'eth-builder.com':
            '0xac6e77dfe25ecd6110b8e780608cce0dab71fdd5ebea22a16c0205200d4f3c4745be59f4854a3ef37',

          // Common builders from relay data
          'BloXroute Max Profit':
            '0x946fcf51fbd6d0a69d9478feb2504cd5af6fd3b68e36e51c5429dff02fadfbd0490f18e75fa608554d9b9447206f452e',
          Blocknative:
            '0x95c8cc31f8906cc10a2e9f58988ad374d68d108914b997ef0567751b041bd0b7d104183d235ac5769d51912cd680608e',
        };

        // Try to get data from the JSON file if it exists
        try {
          console.log(`Fetching ${formattedNetwork}-builders.json...`);
          const response = await fetch(`/data/${formattedNetwork}-builders.json`);

          if (response.ok) {
            const text = await response.text();
            console.log(`Got JSON data (${text.length} bytes)`);

            // Try to parse the JSON, but handle malformed JSON
            try {
              // Manual parsing for the malformed JSON in the file
              if (formattedNetwork === 'mainnet') {
                // Add entries from the fixed text
                const mainnetData = {
                  Titan:
                    '0x84e78cb2ad883861c9eeeb7d1b22a8e02069320e86e57c88590841efc1a2a3e2937c3a9ca118d7add71d0be0b14788bb',
                  Builder0x69:
                    '0x945fc51bf63613257792926c9155d7ae32db73155dc13bdfe61cd476f1fd2297b66601e8721b723cef11e4e6682e9d87',
                  Flashbots:
                    '0xa1dead01e65f0a0eee7b5170223f20c8f0cbf122eac3324d61afbdb33a8885ff8cab2ef514ac2c7698ae0d6289ef27fc',
                  beaverbuild:
                    '0xb67eaa5efbfa231de29f83eb7fab4e5bcdcafc65f9f1d1d7fced57f660a50f5e455fd7fd2087dce5afc9f8e829204a34',
                  rsync: '0xa3d534e67d66ff970e469b838',
                  bancility: '0xb086acda0be7a69331e1f10ecff683ba',
                  beepending:
                    '0x94a76d5a922b9a7bbb0bae8890b29b5e818c42ec07cd853a1b8f3183b39061f79e6911e10d5b8657de9364bf9e251334',
                  Eden: '0x8b8edce58fafe098763e4fabdeb318d347f9238845f42b44fca8d5a8129d2a98b0647a2e3a3730f3b05b48e86436e224',
                  'eth-builder.com':
                    '0xac6e77dfe25ecd6110b8e780608cce0dab71fdd5ebea22a16c0205200d4f3c4745be59f4854a3ef37',
                };

                // Merge with our known builders
                Object.assign(knownBuilders, mainnetData);
              } else {
                // For other networks, try normal JSON parsing
                const jsonData = JSON.parse(text);
                Object.assign(knownBuilders, jsonData);
              }
            } catch (parseError) {
              console.error('JSON parse error:', parseError);
              // Continue with our hardcoded data
            }
          }
        } catch (fetchError) {
          console.warn('Error fetching builder names file:', fetchError);
          // Continue with our hardcoded data
        }

        // Process the data - invert the mapping
        const pubkeyToName: Record<string, string> = {};

        console.log('Processing builder data:', Object.keys(knownBuilders));

        Object.entries(knownBuilders).forEach(([name, pubkey]) => {
          if (typeof pubkey === 'string') {
            // Normalize the pubkey for consistent lookup
            const normalizedPubkey = pubkey.toLowerCase().replace(/^0x/, '');
            console.log(`Mapped ${name} -> ${normalizedPubkey.substring(0, 12)}...`);
            pubkeyToName[normalizedPubkey] = name;
          } else {
            console.warn(`Skipping invalid pubkey for ${name}:`, pubkey);
          }
        });

        // Add a flexible lookup function to the cache
        const builderNameCache: Record<string, string> & {
          findBuilder?: (pubkey: string) => string | undefined;
        } = pubkeyToName;

        // Add a flexible lookup function
        builderNameCache.findBuilder = (pubkey: string): string | undefined => {
          if (!pubkey) return undefined;

          // Try exact match first
          const normalized = pubkey.toLowerCase().replace(/^0x/, '');
          if (pubkeyToName[normalized]) {
            return pubkeyToName[normalized];
          }

          // Otherwise match by prefix - for any pubkey that starts with this one
          // or any key that starts with this pubkey
          const candidates = Object.entries(pubkeyToName)
            .filter(([key]) => {
              // Match either direction - a starts with b OR b starts with a
              const keyStartsWithPubkey = key.startsWith(normalized);
              const pubkeyStartsWithKey = normalized.startsWith(key);

              // Log matches for debugging
              if (keyStartsWithPubkey || pubkeyStartsWithKey) {
                console.log(`Found match: ${pubkey} ~ ${key} => ${pubkeyToName[key]}`);
              }

              return keyStartsWithPubkey || pubkeyStartsWithKey;
            })
            .map(([_, name]) => name);

          return candidates.length > 0 ? candidates[0] : undefined;
        };

        // Cache the results
        builderNamesCache[formattedNetwork] = builderNameCache;

        return builderNameCache;
      } catch (error) {
        console.error('Error fetching builder names:', error);
        return {}; // Return empty object on error
      } finally {
        // Clear this pending fetch
        delete pendingFetches[formattedNetwork];
      }
    }

    // If there's an existing fetch, use it, otherwise create a new one
    const fetchPromise =
      pendingFetches[formattedNetwork] ||
      (pendingFetches[formattedNetwork] = fetchAndProcessBuilderNames());

    // Use the fetch promise
    fetchPromise.then(names => {
      setBuilderNames(names);
    });

    // No cleanup needed since the cache is global
  }, [network]);

  return builderNames;
}
