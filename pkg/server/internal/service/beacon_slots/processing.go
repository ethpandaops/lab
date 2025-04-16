package beacon_slots

import (
	"context"
	"fmt"
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_slots"
)

// processSlot processes a single slot
func (b *BeaconSlots) processSlot(ctx context.Context, networkName string, slot phase0.Slot) (bool, error) {
	startTime := time.Now()
	b.log.WithField("network", networkName).
		WithField("slot", slot).
		Debug("Processing slot")

	// 1. Get block data (should return *pb.BlockData)
	blockData, err := b.getBlockData(ctx, networkName, slot)
	if err != nil {
		return false, fmt.Errorf("failed to get block data: %w", err)
	}
	if blockData == nil {
		b.log.WithField("slot", slot).Debug("No block data found for slot")
		return false, nil
	}

	// 2. Get proposer data (should return *pb.Proposer)
	proposerData, err := b.getProposerData(ctx, networkName, slot)
	if err != nil {
		return false, fmt.Errorf("failed to get proposer data: %w", err)
	}

	// 3. Get entity
	entity, err := b.getProposerEntity(ctx, networkName, blockData.ProposerIndex)
	if err != nil {
		b.log.WithField("slot", slot).WithError(err).Error("Failed to get proposer entity, continuing without it")
	}

	// 4. Get timing data (should return []*pb.Timing, map[string]*pb.BlobTimingMap, etc.)
	blockSeenAtSlotTime, err := b.getBlockSeenAtSlotTime(ctx, networkName, slot)
	if err != nil {
		blockSeenAtSlotTime = map[string]*pb.BlockArrivalTime{}
	}
	blobSeenAtSlotTime, err := b.getBlobSeenAtSlotTime(ctx, networkName, slot)
	if err != nil {
		blobSeenAtSlotTime = map[string]*pb.BlobArrivalTimes{}
	}
	blockFirstSeenInP2PSlotTime, err := b.getBlockFirstSeenInP2PSlotTime(ctx, networkName, slot)
	if err != nil {
		blockFirstSeenInP2PSlotTime = map[string]*pb.BlockArrivalTime{}
	}
	blobFirstSeenInP2PSlotTime, err := b.getBlobFirstSeenInP2PSlotTime(ctx, networkName, slot)
	if err != nil {
		blobFirstSeenInP2PSlotTime = map[string]*pb.BlobArrivalTimes{}
	}

	fullTimings := &pb.FullTimings{
		BlockSeen:         blockSeenAtSlotTime,
		BlobSeen:          blobSeenAtSlotTime,
		BlockFirstSeenP2P: blockFirstSeenInP2PSlotTime,
		BlobFirstSeenP2P:  blobFirstSeenInP2PSlotTime,
	}

	// 5. Get attestation data
	maxAttestationVotes, err := b.getMaximumAttestationVotes(ctx, networkName, slot)
	if err != nil {
		return false, fmt.Errorf("failed to get maximum attestation votes: %w", err)
	}
	attestationVotes, err := b.getAttestationVotes(ctx, networkName, slot, blockData.BlockRoot)
	if err != nil {
		attestationVotes = make(map[int64]int64)
	}

	// 6. Transform the data for storage
	processingTime := time.Since(startTime).Milliseconds()

	slotData, err := b.transformSlotDataForStorage(
		slot,
		networkName,
		time.Now().UTC().Format(time.RFC3339),
		processingTime,
		blockData,
		proposerData,
		maxAttestationVotes,
		entity,
		fullTimings,
		attestationVotes,
	)
	if err != nil {
		return false, fmt.Errorf("failed to transform slot data: %w", err)
	}

	// 7. Store the data to storage
	storageKey := fmt.Sprintf("slots/%s/%d", networkName, slot)

	err = b.storageClient.Store(ctx, storage.StoreParams{
		Key:         b.getStoragePath(storageKey),
		Data:        slotData,
		Format:      storage.CodecNameJSON,
		Compression: storage.Gzip,
	})
	if err != nil {
		return false, fmt.Errorf("failed to store slot data: %w", err)
	}

	return true, nil
}
