package beacon_slots

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_slots"
	"golang.org/x/sync/errgroup"
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
		if strings.Contains(err.Error(), "no rows returned") {
			b.log.WithField("slot", slot).Debug("No block data found for slot")

			return true, nil
		}

		return false, fmt.Errorf("failed to get block data: %w", err)
	}
	if blockData == nil {
		b.log.WithField("slot", slot).Debug("No block data found for slot")
		return false, nil
	}

	// Create an error group for parallel execution
	group, groupCtx := errgroup.WithContext(ctx)

	// Define variables to hold results
	var (
		proposerData                   *pb.Proposer
		entity                         *string
		blockSeenAtSlotTime            map[string]*pb.BlockArrivalTime
		blobSeenAtSlotTime             map[string]*pb.BlobArrivalTimes
		blockFirstSeenInP2PSlotTime    map[string]*pb.BlockArrivalTime
		blobFirstSeenInP2PSlotTime     map[string]*pb.BlobArrivalTimes
		maxAttestationVotes            int64
		attestationVotes               map[int64]int64
		proposerErr, maxAttestationErr error
	)

	// Initialize empty maps
	blockSeenAtSlotTime = map[string]*pb.BlockArrivalTime{}
	blobSeenAtSlotTime = map[string]*pb.BlobArrivalTimes{}
	blockFirstSeenInP2PSlotTime = map[string]*pb.BlockArrivalTime{}
	blobFirstSeenInP2PSlotTime = map[string]*pb.BlobArrivalTimes{}
	attestationVotes = make(map[int64]int64)

	// 2. Get proposer data - can run in parallel
	group.Go(func() error {
		var err error
		proposerData, err = b.getProposerData(groupCtx, networkName, slot)
		proposerErr = err
		return nil // We collect the error but don't fail the group
	})

	// 3. Get entity - depends on blockData, can run in parallel
	group.Go(func() error {
		entity, _ = b.getProposerEntity(groupCtx, networkName, blockData.ProposerIndex)
		return nil // We won't always have an entity.
	})

	// 4. Get timing data - can all run in parallel
	group.Go(func() error {
		var err error
		blockSeenTimes, err := b.getBlockSeenAtSlotTime(groupCtx, networkName, slot)
		if err == nil && blockSeenTimes != nil {
			blockSeenAtSlotTime = blockSeenTimes
		}
		return nil
	})

	group.Go(func() error {
		var err error
		blobSeenTimes, err := b.getBlobSeenAtSlotTime(groupCtx, networkName, slot)
		if err == nil && blobSeenTimes != nil {
			blobSeenAtSlotTime = blobSeenTimes
		}
		return nil
	})

	group.Go(func() error {
		var err error
		blockFirstSeenTimes, err := b.getBlockFirstSeenInP2PSlotTime(groupCtx, networkName, slot)
		if err == nil && blockFirstSeenTimes != nil {
			blockFirstSeenInP2PSlotTime = blockFirstSeenTimes
		}
		return nil
	})

	group.Go(func() error {
		var err error
		blobFirstSeenTimes, err := b.getBlobFirstSeenInP2PSlotTime(groupCtx, networkName, slot)
		if err == nil && blobFirstSeenTimes != nil {
			blobFirstSeenInP2PSlotTime = blobFirstSeenTimes
		}
		return nil
	})

	// 5. Get attestation data - max can run in parallel, votes depends on blockData
	group.Go(func() error {
		var err error
		maxAttestationVotes, err = b.getMaximumAttestationVotes(groupCtx, networkName, slot)
		maxAttestationErr = err
		return nil // We collect the error but don't fail the group
	})

	group.Go(func() error {
		var err error
		votes, err := b.getAttestationVotes(groupCtx, networkName, slot, blockData.BlockRoot)
		if err == nil && votes != nil {
			attestationVotes = votes
		}
		return nil // We collect the error but don't fail the group
	})

	// Wait for all goroutines to complete
	if err := group.Wait(); err != nil {
		return false, fmt.Errorf("parallel processing error: %w", err)
	}

	// Check errors from critical operations
	if proposerErr != nil {
		return false, fmt.Errorf("failed to get proposer data: %w", proposerErr)
	}

	if maxAttestationErr != nil {
		return false, fmt.Errorf("failed to get maximum attestation votes: %w", maxAttestationErr)
	}

	// Create the full timings structure
	fullTimings := &pb.FullTimings{
		BlockSeen:         blockSeenAtSlotTime,
		BlobSeen:          blobSeenAtSlotTime,
		BlockFirstSeenP2P: blockFirstSeenInP2PSlotTime,
		BlobFirstSeenP2P:  blobFirstSeenInP2PSlotTime,
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
