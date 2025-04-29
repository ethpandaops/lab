import { createLabApiClient, LabApiClientType } from '@/api/client.ts';

// Import specific message types if needed for constructing requests or detailed type checking
// Note: The client methods often infer these types, but explicit imports can be useful.
import { GetRecentLocallyBuiltBlocksRequest } from '@/api/gen/backend/pkg/api/proto/lab_api_pb';

/**
 * Example function to demonstrate how to use the generated API client.
 *
 * This example creates a client, makes a request to get recent locally built blocks,
 * and logs the response.
 */
export const exampleApiUsage = async () => {
  // 1. Create the API client instance
  // Replace "http://localhost:8080" with your actual API server URL
  const apiClient: LabApiClientType = createLabApiClient("http://localhost:8080");

  // 2. Prepare the request data (plain JavaScript object matching the request message structure)
  const requestData = new GetRecentLocallyBuiltBlocksRequest({
    network: 'mainnet',
    // Add other request fields if the proto definition changes
  });

  console.log('Making API call to getRecentLocallyBuiltBlocks...');

  try {
    // 3. Call the API method using the Connect client
    const response = await apiClient.getRecentLocallyBuiltBlocks(requestData);

    // 4. Process the response
    console.log('API call successful!');

    // Type guard to ensure response and slotBlocks exist
    if (response.slotBlocks.length > 0) {
      console.log(`Received ${response.slotBlocks.length} slot blocks.`);
      
      // Process the response data
      response.slotBlocks.forEach((slotBlock) => {
        console.log(`  Slot: ${slotBlock.slot}`);

        if (slotBlock.blocks.length > 0) {
          slotBlock.blocks.forEach((block) => {
            // Access fields directly from the response object
            console.log(`    Block Version: ${block.blockVersion}`);
            console.log(`    Block Total Bytes: ${block.blockTotalBytes}`);

            if (block.metadata) {
              console.log(`      Client Name: ${block.metadata.metaClientName}`);
              console.log(`      Client Geo City: ${block.metadata.metaClientGeoCity}`);
            }
          });
        }
      });
    } else {
      console.log('No slot blocks received in the response.');
    }

    return response; // Return the response object

  } catch (error) {
    console.error('Error calling API:', error);
    // Handle errors appropriately in a real application
    throw error;
  }
};
