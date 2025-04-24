// Export the singleton client
export { getLabApiClient, resetLabApiClient } from './singleton';

// Export the client creator for cases where a custom instance is needed
export { createLabApiClient, type LabApiClientType } from './client';

// Re-export the generated proto types for convenience
export * from './gen/backend/pkg/api/proto/lab_api_pb'; 