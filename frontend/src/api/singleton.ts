import { createLabApiClient, LabApiClient } from '@/api/client.ts';

let client: LabApiClient | null = null;

/**
 * Get the singleton LabAPI client instance.
 * This function will initialize the client on first call and return the same instance on subsequent calls.
 */
export async function getLabApiClient(): Promise<LabApiClient> {
  // If client is already initialized, return it
  if (client) {
    return client;
  }

  try {
    // Dynamically import the config to avoid circular dependencies
    const { getDataUrl } = await import('../config');

    // The backend URL is part of the data URL without the trailing path
    // We can extract the base URL from the data URL of an empty path
    const baseUrl = getDataUrl('').replace(/\/$/, '');

    // Create the client using the URL from config
    client = createLabApiClient(baseUrl);

    return client;
  } catch (error) {
    console.error('Failed to initialize Lab API client:', error);
    throw error;
  }
}

/**
 * Reset the singleton client instance.
 * Useful for testing or when configuration changes.
 */
export function resetLabApiClient(): void {
  client = null;
}
