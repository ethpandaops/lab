import { createLabApiClient, LabApiClient } from '@/api/client.ts';
import { RestApiClient } from './rest/client';

let client: LabApiClient | null = null;
let restApiClient: RestApiClient | null = null;

/**
 * Get the base API URL from bootstrap
 */
async function getBaseApiUrl(): Promise<string> {
  try {
    // Try to get the base URL from the bootstrap configuration
    const bootstrap = await import('../bootstrap');
    const config = await bootstrap.default();
    return config.backend.url;
  } catch (error) {
    // Fallback to dev defaults if bootstrap fails
    console.warn('Failed to get base URL from bootstrap, using dev defaults:', error);
    return import.meta.env.DEV ? '/lab-data' : '';
  }
}

/**
 * Get the REST API URL from bootstrap
 */
async function getRestApiUrl(): Promise<string> {
  try {
    // Try to get the REST API URL from the bootstrap configuration
    const bootstrap = await import('../bootstrap');
    const config = await bootstrap.default();

    // If a separate REST API URL is configured, use it
    if (config.backend.restApiUrl) {
      return config.backend.restApiUrl;
    }

    // Otherwise fall back to the main backend URL (REST client will strip /lab-data)
    return config.backend.url;
  } catch (error) {
    // Fallback to dev defaults if bootstrap fails
    console.warn('Failed to get REST API URL from bootstrap, using dev defaults:', error);
    return import.meta.env.DEV ? '/lab-data' : '';
  }
}

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
    const baseUrl = await getBaseApiUrl();

    // Create the client using the URL from config
    client = createLabApiClient(baseUrl);

    return client;
  } catch (error) {
    console.error('Failed to initialize Lab API client:', error);
    throw error;
  }
}

/**
 * Get the singleton REST API client instance.
 * This function will initialize the client on first call and return the same instance on subsequent calls.
 */
export async function getRestApiClient(): Promise<RestApiClient> {
  // If client is already initialized, return it
  if (restApiClient) {
    return restApiClient;
  }

  try {
    const restApiUrl = await getRestApiUrl();

    // Create the REST client (it will handle removing /lab-data suffix if needed)
    restApiClient = new RestApiClient(restApiUrl);

    return restApiClient;
  } catch (error) {
    console.error('Failed to initialize REST API client:', error);
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

/**
 * Reset the singleton REST client instance.
 * Useful for testing or when configuration changes.
 */
export function resetRestApiClient(): void {
  restApiClient = null;
}

/**
 * Reset all singleton clients.
 * Useful for testing or when configuration changes.
 */
export function resetAllClients(): void {
  client = null;
  restApiClient = null;
}
