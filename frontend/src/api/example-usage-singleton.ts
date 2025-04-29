import { getLabApiClient } from '@/api/singleton.ts';
import { GetRecentLocallyBuiltBlocksRequest } from '@/api/gen/backend/pkg/api/proto/lab_api_pb';

/**
 * Example function demonstrating how to use the singleton LabAPI client.
 */
export const exampleSingletonApiUsage = async () => {
  try {
    // Get the singleton API client
    const apiClient = await getLabApiClient();
    
    // Create a request object
    const requestData = new GetRecentLocallyBuiltBlocksRequest({
      network: "mainnet" // This is the only field available in the proto definition
    });
    
    console.log('Making API call to getRecentLocallyBuiltBlocks...');
    
    // Call the API method
    const response = await apiClient.getRecentLocallyBuiltBlocks(requestData);
    
    console.log('API call successful!');
    console.log('Recent locally built blocks:', response);
    
    return response;
  } catch (error) {
    console.error('Error calling API:', error);
    throw error;
  }
}; 