import {
  ListNodesResponse,
  ListNetworksResponse,
  ErrorResponse,
} from '../gen/backend/pkg/api/v1/proto/public_pb';
import { API_V1_ENDPOINTS, buildQueryString, NodeFilters, NetworkFilters } from './endpoints';

/**
 * REST API client for v1 endpoints
 *
 * Note: The getNodes() method automatically filters for xatu public nodes
 * (meta_client_name starting with 'pub-' or 'ethpandaops').
 * Use getAllNodes() if you need to fetch all nodes without this filter.
 */
export class RestApiClient {
  private baseUrl: string;
  private maxRetries = 3;
  private retryDelay = 1000; // milliseconds

  constructor(baseUrl: string) {
    // Remove trailing slash
    let cleanUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // Remove /lab-data suffix if present (for backward compatibility)
    // This handles the case where a dedicated REST API URL is not provided
    if (cleanUrl.endsWith('/lab-data')) {
      cleanUrl = cleanUrl.slice(0, -9); // Remove '/lab-data' (9 characters)
      console.log('REST API Client: Removed /lab-data suffix from URL');
    }

    this.baseUrl = cleanUrl;
    console.log('REST API Client initialized with base URL:', this.baseUrl);
  }

  /**
   * Get list of available networks
   * @param filters Optional filters for networks
   * @returns ListNetworksResponse
   */
  async getNetworks(filters?: NetworkFilters): Promise<ListNetworksResponse> {
    const queryString = filters ? buildQueryString(filters) : new URLSearchParams();
    const url = `${this.baseUrl}${API_V1_ENDPOINTS.networks}${
      queryString.toString() ? `?${queryString.toString()}` : ''
    }`;

    console.log('Fetching networks from:', url);
    const response = await this.fetchWithRetry<any>(url);

    // The REST API returns JSON that matches the protobuf message format
    // Use fromJson to deserialize the JSON response into protobuf message instance
    return ListNetworksResponse.fromJson(response);
  }

  /**
   * Get list of xatu public nodes for a specific network
   * Automatically filters for nodes with meta_client_name starting with 'pub-' or 'ethpandaops'
   * @param network Network name
   * @param filters Optional additional filters for nodes
   * @returns ListNodesResponse with combined results from both filters
   */
  async getNodes(network: string, filters?: NodeFilters): Promise<ListNodesResponse> {
    // Always add the meta_client_name filter for xatu public nodes
    const baseFilters = { ...filters };

    // Determine which prefix to use based on username filter
    const username = filters?.username;
    const isEthpandaopsUser =
      (typeof username === 'string' && username === 'ethpandaops') ||
      (typeof username === 'object' && 'eq' in username && username.eq === 'ethpandaops');

    if (isEthpandaopsUser) {
      // For ethpandaops user, only fetch nodes with ethpandaops prefix
      const ethpandaopsFilters = {
        ...baseFilters,
        meta_client_name: { starts_with: 'ethpandaops' },
      };
      const queryString = buildQueryString(ethpandaopsFilters);
      const url = `${this.baseUrl}${API_V1_ENDPOINTS.nodes(network)}${
        queryString.toString() ? `?${queryString.toString()}` : ''
      }`;

      console.log('Fetching ethpandaops nodes from:', url);
      const response = await this.fetchWithRetry<any>(url);
      const nodes = ListNodesResponse.fromJson(response);
      console.log(`Fetched ${nodes.nodes.length} ethpandaops nodes`);
      return nodes;
    } else if (username) {
      // For other specific users, only fetch nodes with pub- prefix
      const pubFilters = {
        ...baseFilters,
        meta_client_name: { starts_with: 'pub-' },
      };
      const queryString = buildQueryString(pubFilters);
      const url = `${this.baseUrl}${API_V1_ENDPOINTS.nodes(network)}${
        queryString.toString() ? `?${queryString.toString()}` : ''
      }`;

      console.log('Fetching pub- nodes from:', url);
      const response = await this.fetchWithRetry<any>(url);
      const nodes = ListNodesResponse.fromJson(response);
      console.log(`Fetched ${nodes.nodes.length} pub- nodes`);
      return nodes;
    } else {
      // For general queries (no specific user), fetch both pub- and ethpandaops nodes
      // This is used for the main xatu page showing all nodes
      const pubFilters = {
        ...baseFilters,
        meta_client_name: { starts_with: 'pub-' },
      };
      const pubQueryString = buildQueryString(pubFilters);
      const pubUrl = `${this.baseUrl}${API_V1_ENDPOINTS.nodes(network)}${
        pubQueryString.toString() ? `?${pubQueryString.toString()}` : ''
      }`;

      const ethpandaopsFilters = {
        ...baseFilters,
        meta_client_name: { starts_with: 'ethpandaops' },
      };
      const ethpandaopsQueryString = buildQueryString(ethpandaopsFilters);
      const ethpandaopsUrl = `${this.baseUrl}${API_V1_ENDPOINTS.nodes(network)}${
        ethpandaopsQueryString.toString() ? `?${ethpandaopsQueryString.toString()}` : ''
      }`;

      console.log('Fetching nodes with meta_client_name filters:');
      console.log('  - pub- nodes from:', pubUrl);
      console.log('  - ethpandaops nodes from:', ethpandaopsUrl);

      // Execute both requests in parallel for better performance
      const [pubResponse, ethpandaopsResponse] = await Promise.all([
        this.fetchWithRetry<any>(pubUrl),
        this.fetchWithRetry<any>(ethpandaopsUrl),
      ]);

      // Parse responses
      const pubNodes = ListNodesResponse.fromJson(pubResponse);
      const ethpandaopsNodes = ListNodesResponse.fromJson(ethpandaopsResponse);

      // Combine the results
      const combinedNodes = [...pubNodes.nodes, ...ethpandaopsNodes.nodes];

      console.log(
        `Fetched ${pubNodes.nodes.length} pub- nodes and ${ethpandaopsNodes.nodes.length} ethpandaops nodes (total: ${combinedNodes.length})`,
      );

      // Create a combined response
      return new ListNodesResponse({
        nodes: combinedNodes,
        pagination: pubNodes.pagination, // Use pagination from first response
        filters: pubNodes.filters,
      });
    }
  }

  /**
   * Get list of ALL nodes for a specific network (without xatu public filter)
   * Use this method when you need all nodes, not just xatu public nodes
   * @param network Network name
   * @param filters Optional filters for nodes
   * @returns ListNodesResponse
   */
  async getAllNodes(network: string, filters?: NodeFilters): Promise<ListNodesResponse> {
    const queryString = filters ? buildQueryString(filters) : new URLSearchParams();
    const url = `${this.baseUrl}${API_V1_ENDPOINTS.nodes(network)}${
      queryString.toString() ? `?${queryString.toString()}` : ''
    }`;

    console.log('Fetching ALL nodes from:', url);
    const response = await this.fetchWithRetry<any>(url);

    // The REST API returns JSON that matches the protobuf message format
    // Use fromJson to deserialize the JSON response into protobuf message instance
    return ListNodesResponse.fromJson(response);
  }

  /**
   * Fetch with automatic retry on failure
   * @param url URL to fetch
   * @param options Fetch options
   * @returns Response data
   */
  private async fetchWithRetry<T>(url: string, options?: RequestInit, retryCount = 0): Promise<T> {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...options?.headers,
        },
      });

      if (!response.ok) {
        // Try to parse error response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          const errorResponse = ErrorResponse.fromJson(errorData);
          errorMessage = errorResponse.message || errorResponse.error || errorMessage;
        } catch {
          // If we can't parse the error, use the default message
        }

        // Retry on 5xx errors
        if (response.status >= 500 && retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
          return this.fetchWithRetry<T>(url, options, retryCount + 1);
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      // Retry on network errors
      if (retryCount < this.maxRetries && this.isNetworkError(error)) {
        await this.delay(this.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
        return this.fetchWithRetry<T>(url, options, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * Check if error is a network error
   * @param error Error to check
   * @returns True if network error
   */
  private isNetworkError(error: any): boolean {
    return (
      error instanceof TypeError &&
      (error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError') ||
        error.message.includes('ERR_NETWORK'))
    );
  }

  /**
   * Delay for a specified amount of time
   * @param ms Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Parameters for getNetworks API call
 */
export interface NetworksParams extends NetworkFilters {}

/**
 * Parameters for getNodes API call
 */
export interface NodesParams extends NodeFilters {}

/**
 * Export the getAllNodes method type for external use
 */
export type GetAllNodesMethod = RestApiClient['getAllNodes'];
