import { labapi, beacon_slots } from './proto';

// Option 2: Import only what you need (better for tree-shaking)
import { GetRecentLocallyBuiltBlocksRequest, GetRecentLocallyBuiltBlocksResponse } from './proto/labapi';
import { LocallyBuiltBlock, LocallyBuiltSlotBlocks } from './proto/beacon_slots';

/**
 * Example function to demonstrate how to use the generated TypeScript types
 * 
 * This example creates a request object to get recent locally built blocks
 * and then decodes a hypothetical response.
 */
export const exampleApiUsage = () => {
  // Create a request message (using namespace import)
  const request = labapi.GetRecentLocallyBuiltBlocksRequest.create({
    network: 'mainnet',
  });

  // Alternative: create request using direct import
  const request2 = GetRecentLocallyBuiltBlocksRequest.create({
    network: 'mainnet',
  });

  // Encode the request for sending to the server
  const encodedRequest = labapi.GetRecentLocallyBuiltBlocksRequest.encode(request).finish();
  
  // This would be sent via fetch or another HTTP client
  console.log('Encoded request:', encodedRequest);
  
  // Assuming we get a response back, decode it
  // In a real application, this would come from the server response
  // This is just an example of how to decode
  const mockResponse = new Uint8Array(); // In a real app, this would be the binary response
  try {
    const response = labapi.GetRecentLocallyBuiltBlocksResponse.decode(mockResponse);
    
    // Use the decoded response data
    if (response.slotBlocks && response.slotBlocks.length > 0) {
      // Access the slot blocks
      response.slotBlocks.forEach((slotBlock) => {
        console.log(`Slot: ${slotBlock.slot}`);
        
        // Access blocks within the slot
        if (slotBlock.blocks) {
          slotBlock.blocks.forEach((block) => {
            console.log(`Block Version: ${block.blockVersion}`);
            console.log(`Block Total Bytes: ${block.blockTotalBytes}`);
            
            // Access metadata
            if (block.metadata) {
              console.log(`Client Name: ${block.metadata.metaClientName}`);
              console.log(`Client Geo City: ${block.metadata.metaClientGeoCity}`);
            }
          });
        }
      });
    }
    
    return response;
  } catch (error) {
    console.error('Error decoding response:', error);
    throw error;
  }
};

/**
 * Example of how to create a client interface for the LabAPI service
 */
export class LabAPIClient {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  /**
   * Get recent locally built blocks from the API
   * @param network The network to get blocks for
   * @returns Promise with the response
   */
  async getRecentLocallyBuiltBlocks(network: string): Promise<labapi.IGetRecentLocallyBuiltBlocksResponse> {
    // Create the request message
    const request = labapi.GetRecentLocallyBuiltBlocksRequest.create({ network });
    
    // In a real implementation, you would make an HTTP request to the API
    // Here's a simplified example
    try {
      const response = await fetch(`${this.baseUrl}/v1/beacon/local_blocks/${network}/latest`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      // Parse the response as JSON
      const jsonData = await response.json();
      
      // Convert the JSON response to our generated type
      // In a real gRPC implementation, you'd decode binary data instead
      return labapi.GetRecentLocallyBuiltBlocksResponse.fromObject(jsonData);
    } catch (error) {
      console.error('Error fetching recent locally built blocks:', error);
      throw error;
    }
  }
} 