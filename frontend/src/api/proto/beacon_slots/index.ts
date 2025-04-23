// Export all types from the beacon_slots namespace
import * as proto from '../proto';

export const {
  BeaconSlots,
  BeaconSlotData,
  AttestationWindow,
  AttestationsData,
  BlobArrivalTime,
  BlobArrivalTimes,
  BlobTimingMap,
  BlockArrivalTime,
  BlockData,
  FullTimings,
  Geo,
  GetRecentLocallyBuiltBlocksRequest,
  GetRecentLocallyBuiltBlocksResponse,
  GetRecentValidatorBlocksRequest,
  GetRecentValidatorBlocksResponse,
  LocallyBuiltBlock,
  LocallyBuiltBlockMetadata,
  LocallyBuiltSlotBlocks,
  Node,
  Proposer,
  SlimTimings,
} = proto.beacon_slots;

// Export interfaces
export type IBeaconSlotData = proto.beacon_slots.IBeaconSlotData;
export type IAttestationWindow = proto.beacon_slots.IAttestationWindow;
export type IAttestationsData = proto.beacon_slots.IAttestationsData;
export type IBlobArrivalTime = proto.beacon_slots.IBlobArrivalTime;
export type IBlobArrivalTimes = proto.beacon_slots.IBlobArrivalTimes;
export type IBlobTimingMap = proto.beacon_slots.IBlobTimingMap;
export type IBlockArrivalTime = proto.beacon_slots.IBlockArrivalTime;
export type IBlockData = proto.beacon_slots.IBlockData;
export type IFullTimings = proto.beacon_slots.IFullTimings;
export type IGeo = proto.beacon_slots.IGeo;
export type IGetRecentLocallyBuiltBlocksRequest = proto.beacon_slots.IGetRecentLocallyBuiltBlocksRequest;
export type IGetRecentLocallyBuiltBlocksResponse = proto.beacon_slots.IGetRecentLocallyBuiltBlocksResponse;
export type IGetRecentValidatorBlocksRequest = proto.beacon_slots.IGetRecentValidatorBlocksRequest;
export type IGetRecentValidatorBlocksResponse = proto.beacon_slots.IGetRecentValidatorBlocksResponse;
export type ILocallyBuiltBlock = proto.beacon_slots.ILocallyBuiltBlock;
export type ILocallyBuiltBlockMetadata = proto.beacon_slots.ILocallyBuiltBlockMetadata;
export type ILocallyBuiltSlotBlocks = proto.beacon_slots.ILocallyBuiltSlotBlocks;
export type INode = proto.beacon_slots.INode;
export type IProposer = proto.beacon_slots.IProposer;
export type ISlimTimings = proto.beacon_slots.ISlimTimings;
