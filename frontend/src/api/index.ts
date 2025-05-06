// Export the singleton client
export { getLabApiClient, resetLabApiClient } from '@/api/singleton.ts';

// Export the client creator for cases where a custom instance is needed
export { createLabApiClient, type LabApiClientType } from '@/api/client.ts';

// Re-export the generated proto types for convenience
export * from '@/api/gen/backend/pkg/api/proto/lab_api_pb';
