import { createPromiseClient, PromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

// Import the generated LabAPI service
import { LabAPI } from "./gen/backend/pkg/api/proto/lab_api_connectweb.ts"; // Corrected import path

// Define the type for the client
export type LabApiClientType = PromiseClient<typeof LabAPI>;

/**
 * Creates a LabAPI client instance.
 *
 * @param baseUrl The base URL of the LabAPI server (e.g., "http://localhost:8080").
 * @returns A PromiseClient for the LabAPI service.
 */
export function createLabApiClient(baseUrl: string): LabApiClientType {
  // Create a transport using the Connect-Web transport
  const transport = createConnectTransport({
    baseUrl,
  });

  // Create the promise-based client
  const client = createPromiseClient(LabAPI, transport);

  return client;
}
