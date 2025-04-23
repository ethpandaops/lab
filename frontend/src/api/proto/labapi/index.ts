// Export all types from the labapi namespace
import * as labapi from '../proto';

export const {
  LabAPI,
  GetRecentLocallyBuiltBlocksRequest,
  GetRecentLocallyBuiltBlocksResponse,
} = labapi.labapi;

// Export interfaces
export type IGetRecentLocallyBuiltBlocksRequest = labapi.labapi.IGetRecentLocallyBuiltBlocksRequest;
export type IGetRecentLocallyBuiltBlocksResponse = labapi.labapi.IGetRecentLocallyBuiltBlocksResponse;
