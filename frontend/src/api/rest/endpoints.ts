/**
 * API endpoint configuration for REST API v1
 */

/**
 * Build API v1 endpoint URLs
 */
export const API_V1_ENDPOINTS = {
  networks: '/api/v1/networks',
  nodes: (network: string) => `/api/v1/${network}/nodes`,
};

/**
 * Build query string from parameters, supporting Stripe-style bracket notation for filters
 * @param params Query parameters
 * @returns URLSearchParams object
 */
export function buildQueryString(params: Record<string, any>): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    // Handle nested object filters (e.g., username: { eq: 'test' })
    if (typeof value === 'object' && !Array.isArray(value)) {
      Object.entries(value).forEach(([operator, operatorValue]) => {
        if (operatorValue !== undefined && operatorValue !== null) {
          // Use bracket notation for nested filters (e.g., username[eq]=test)
          searchParams.append(`${key}[${operator}]`, String(operatorValue));
        }
      });
    } else if (Array.isArray(value)) {
      // Handle array values
      value.forEach(item => {
        searchParams.append(key, String(item));
      });
    } else {
      // Handle simple values
      searchParams.append(key, String(value));
    }
  });

  return searchParams;
}

/**
 * Filter operators for node queries
 */
export interface FilterOperator<T> {
  eq?: T; // equals
  neq?: T; // not equals
  gt?: T; // greater than
  gte?: T; // greater than or equal
  lt?: T; // less than
  lte?: T; // less than or equal
  contains?: T; // contains (for strings)
  starts_with?: T; // starts with (for strings)
  ends_with?: T; // ends with (for strings)
  in?: T[]; // in array
  not_in?: T[]; // not in array
}

/**
 * Node filter parameters using Stripe-style bracket notation
 */
export interface NodeFilters {
  username?: string | FilterOperator<string>;
  client_name?: string | FilterOperator<string>;
  client_version?: string | FilterOperator<string>;
  client_implementation?: string | FilterOperator<string>;
  consensus_version?: string | FilterOperator<string>;
  consensus_implementation?: string | FilterOperator<string>;
  classification?: string | FilterOperator<string>;
  city?: string | FilterOperator<string>;
  country?: string | FilterOperator<string>;
  country_code?: string | FilterOperator<string>;
  continent_code?: string | FilterOperator<string>;
  last_seen?: string | FilterOperator<string>;
  meta_client_name?: string | FilterOperator<string>;
  page_size?: number;
  page_token?: string;
  order_by?: string;
}

/**
 * Network filter parameters
 */
export interface NetworkFilters {
  active_only?: boolean;
  status?: string | FilterOperator<string>;
  chain_id?: number | FilterOperator<number>;
}
