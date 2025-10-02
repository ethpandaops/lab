import type { SlotAnalysis } from './types';

export function analyzeSlotData(slotData: any): SlotAnalysis {
  if (!slotData) {
    return {
      firstBlockTime: null,
      firstBlobTime: null,
      blobCount: 0,
      gasUsagePercent: null,
      participation: null,
      hasMevRelay: false,
      totalAttestations: 0,
    };
  }

  const blockSeenTimes = [
    ...Object.values(slotData.timings?.blockSeen || {}).map(time => Number(time)),
    ...Object.values(slotData.timings?.blockFirstSeenP2p || {}).map(time => Number(time)),
  ];
  const firstBlockTime = blockSeenTimes.length > 0 ? Math.min(...blockSeenTimes) : null;

  const blobSeenTimes: number[] = [];
  if (slotData.timings?.blobSeen) {
    Object.values(slotData.timings.blobSeen).forEach((nodeData: any) => {
      if ('timings' in nodeData) {
        Object.values(nodeData.timings).forEach(time => blobSeenTimes.push(Number(time)));
      } else {
        Object.values(nodeData).forEach(time => blobSeenTimes.push(Number(time)));
      }
    });
  }

  if (slotData.timings?.blobFirstSeenP2p) {
    Object.values(slotData.timings.blobFirstSeenP2p).forEach((nodeData: any) => {
      if ('timings' in nodeData) {
        Object.values(nodeData.timings).forEach(time => blobSeenTimes.push(Number(time)));
      } else {
        Object.values(nodeData).forEach(time => blobSeenTimes.push(Number(time)));
      }
    });
  }

  const firstBlobTime = blobSeenTimes.length > 0 ? Math.min(...blobSeenTimes) : null;

  const blobIndices = new Set();
  if (slotData?.timings?.blobSeen) {
    Object.values(slotData.timings.blobSeen).forEach((nodeData: any) => {
      if ('timings' in nodeData) {
        Object.keys(nodeData.timings).forEach(index => blobIndices.add(index));
      } else {
        Object.keys(nodeData).forEach(index => blobIndices.add(index));
      }
    });
  }

  if (slotData?.timings?.blobFirstSeenP2p) {
    Object.values(slotData.timings.blobFirstSeenP2p).forEach((nodeData: any) => {
      if ('timings' in nodeData) {
        Object.keys(nodeData.timings).forEach(index => blobIndices.add(index));
      } else {
        Object.keys(nodeData).forEach(index => blobIndices.add(index));
      }
    });
  }

  const gasUsage = slotData.block?.executionPayloadGasUsed;
  const gasLimit = slotData.block?.executionPayloadGasLimit;
  const gasUsagePercent =
    gasUsage && gasLimit ? Math.min((Number(gasUsage) / Number(gasLimit)) * 100, 100) : null;

  const totalAttestations =
    slotData.attestations?.windows?.reduce(
      (sum: number, window: any) => sum + window.validatorIndices.length,
      0,
    ) || 0;

  const maxPossibleValidators = slotData.attestations?.maximumVotes
    ? Number(slotData.attestations.maximumVotes)
    : 0;
  const participation =
    maxPossibleValidators > 0 ? (totalAttestations / maxPossibleValidators) * 100 : null;

  const hasMevRelay =
    slotData?.deliveredPayloads && Object.keys(slotData.deliveredPayloads).length > 0;

  return {
    firstBlockTime,
    firstBlobTime,
    blobCount: blobIndices.size,
    gasUsagePercent,
    participation,
    hasMevRelay,
    totalAttestations,
  };
}
