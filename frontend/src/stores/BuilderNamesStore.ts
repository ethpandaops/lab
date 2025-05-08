/**
 * Singleton store for builder names
 */
class BuilderNamesStore {
  private static instance: BuilderNamesStore;
  private builderNames: Map<string, string> = new Map();
  private loadPromises: Map<string, Promise<void>> = new Map();

  private constructor() {}

  public static getInstance(): BuilderNamesStore {
    if (!BuilderNamesStore.instance) {
      BuilderNamesStore.instance = new BuilderNamesStore();
    }
    return BuilderNamesStore.instance;
  }
  public async loadBuilderNames(network: string): Promise<void> {
    // Return existing promise if we're already loading for this network
    if (this.loadPromises.has(network)) {
      return this.loadPromises.get(network);
    }

    const loadPromise = new Promise<void>(resolve => {
      // Use a regular function and call the async work inside
      const fetchData = async () => {
        try {
          const response = await fetch(`/data/${network}-builders.json`);

          if (!response.ok) {
            throw new Error(`Failed to fetch builder names: ${response.status}`);
          }

          const data = await response.json();

          // The data is structured as { "builder": { "BuilderName": ["pubkey1", "pubkey2"], ... } }
          if (data.builder) {
            // Iterate through each builder
            Object.entries(data.builder).forEach(([builderName, pubkeys]) => {
              // Each builder has an array of pubkeys
              if (Array.isArray(pubkeys)) {
                pubkeys.forEach((pubkey: string) => {
                  if (typeof pubkey === 'string') {
                    // Normalize the pubkey (remove 0x prefix and convert to lowercase)
                    const normalizedPubkey = pubkey.toLowerCase().replace(/^0x/, '');
                    this.builderNames.set(normalizedPubkey, builderName);

                    // Also store with 0x prefix for convenience
                    this.builderNames.set(`0x${normalizedPubkey}`, builderName);
                  }
                });
              }
            });
          }

          resolve();
        } catch (error) {
          console.error('Error loading builder names:', error);
          resolve(); // Resolve anyway to prevent blocking UI
        }
      };

      // Call the async function
      fetchData();
    });

    this.loadPromises.set(network, loadPromise);
    return loadPromise;
  }

  public getBuilderName(pubkey: string): string | undefined {
    if (!pubkey) return undefined;

    // Normalize the pubkey (remove 0x prefix and convert to lowercase)
    const normalizedPubkey = pubkey.toLowerCase();

    // Try with original format first
    let result = this.builderNames.get(normalizedPubkey);
    if (result) return result;

    // Try without 0x prefix
    const withoutPrefix = normalizedPubkey.replace(/^0x/, '');
    result = this.builderNames.get(withoutPrefix);
    if (result) return result;

    // Try with 0x prefix
    result = this.builderNames.get(`0x${withoutPrefix}`);
    return result;
  }
}

export default BuilderNamesStore;
