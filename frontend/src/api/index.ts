// Export the singleton clients
export {
  getLabApiClient,
  resetLabApiClient,
  getRestApiClient,
  resetRestApiClient,
  resetAllClients,
} from '@/api/singleton.ts';

// Export the client creator for cases where a custom instance is needed
export { createLabApiClient, type LabApiClient } from '@/api/client.ts';

// Export REST client and types
export { RestApiClient } from './rest/client';
export type { NetworksParams, NodesParams } from './rest/client';
export type { NodeFilters, NetworkFilters, FilterOperator } from './rest/endpoints';

// Re-export the generated proto types for convenience
export * from '@/api/gen/backend/pkg/api/proto/lab_api_pb';

// Re-export protobuf types from v1 API for convenience
export {
  ListNodesResponse,
  ListNetworksResponse,
  Node,
  Network,
  ClientInfo,
  GeoInfo,
  ConsensusInfo,
  PaginationMetadata,
  FilterMetadata,
  NetworkFilterMetadata,
  ErrorResponse,
} from './gen/backend/pkg/api/v1/proto/public_pb';
