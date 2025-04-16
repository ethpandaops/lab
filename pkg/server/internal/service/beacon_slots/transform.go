package beacon_slots

import (
	"time"

	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_slots"
	"google.golang.org/protobuf/types/known/timestamppb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

// parseTimestamp parses ISO8601 strings to timestamps
func parseTimestamp(ts string) (*timestamppb.Timestamp, error) {
	t, err := time.Parse(time.RFC3339, ts)
	if err != nil {
		return nil, err
	}
	return timestamppb.New(t), nil
}

// transformSlotDataForStorage transforms slot data into optimized format for storage
func (b *BeaconSlots) transformSlotDataForStorage(
	slot int64,
	network string,
	processedAt string,
	processingTimeMs int64,
	blockData *pb.BlockData,
	proposerData *pb.Proposer,
	maximumAttestationVotes int64,
	entity *string,
	arrivalTimes *pb.FullTimings,
	attestationVotes map[int64]int64,
) (*pb.BeaconSlotData, error) {
	nodes := make(map[string]*pb.Node)

	// Helper to add node
	addNode := func(name, username, city, country, continent string, lat, lon *float64) {
		// Only add node if it doesn't exist
		if _, exists := nodes[name]; !exists {
			geo := &pb.Geo{
				City:      city,
				Country:   country,
				Continent: continent,
			}

			if lat != nil {
				geo.Latitude = wrapperspb.Double(*lat)
			}

			if lon != nil {
				geo.Longitude = wrapperspb.Double(*lon)
			}

			nodes[name] = &pb.Node{
				Name:     name,
				Username: username,
				Geo:      geo,
			}
		}
	}

	// Build nodes from block and blob arrival times
	for _, t := range arrivalTimes.BlockSeen {
		lat, lon := b.lookupGeoCoordinates(t.MetaClientGeoCity, t.MetaClientGeoCountry)
		addNode(t.MetaClientName, t.MetaClientName, t.MetaClientGeoCity, t.MetaClientGeoCountry, t.MetaClientGeoContinentCode, lat, lon)
	}

	for _, t := range arrivalTimes.BlockFirstSeenP2P {
		lat, lon := b.lookupGeoCoordinates(t.MetaClientGeoCity, t.MetaClientGeoCountry)
		addNode(t.MetaClientName, t.MetaClientName, t.MetaClientGeoCity, t.MetaClientGeoCountry, t.MetaClientGeoContinentCode, lat, lon)
	}

	for _, t := range arrivalTimes.BlobSeen {
		for _, blob := range t.ArrivalTimes {
			lat, lon := b.lookupGeoCoordinates(blob.MetaClientGeoCity, blob.MetaClientGeoCountry)
			addNode(blob.MetaClientName, blob.MetaClientName, blob.MetaClientGeoCity, blob.MetaClientGeoCountry, blob.MetaClientGeoContinentCode, lat, lon)
		}
	}

	for _, t := range arrivalTimes.BlobFirstSeenP2P {
		for _, blob := range t.ArrivalTimes {
			lat, lon := b.lookupGeoCoordinates(blob.MetaClientGeoCity, blob.MetaClientGeoCountry)
			addNode(blob.MetaClientName, blob.MetaClientName, blob.MetaClientGeoCity, blob.MetaClientGeoCountry, blob.MetaClientGeoContinentCode, lat, lon)
		}
	}

	// Attestation windows
	attestationBuckets := make(map[int64][]int64)
	for validatorIndex, timeMs := range attestationVotes {
		bucket := timeMs - (timeMs % 50)
		attestationBuckets[bucket] = append(attestationBuckets[bucket], validatorIndex)
	}
	attestationWindows := make([]*pb.AttestationWindow, 0, len(attestationBuckets))
	for startMs, indices := range attestationBuckets {
		window := &pb.AttestationWindow{
			StartMs:          startMs,
			EndMs:            startMs + 50,
			ValidatorIndices: indices,
		}
		attestationWindows = append(attestationWindows, window)
	}

	attestations := &pb.AttestationsData{
		Windows:      attestationWindows,
		MaximumVotes: maximumAttestationVotes,
	}

	// Convert to SlimTimings so we drop the redundant data.
	timings := &pb.SlimTimings{}
	// Convert blocks
	for clientName, blockArrivalTime := range arrivalTimes.BlockSeen {
		timings.BlockSeen[clientName] = blockArrivalTime.SlotTime
	}
	for clientName, blockArrivalTime := range arrivalTimes.BlockFirstSeenP2P {
		timings.BlockFirstSeenP2P[clientName] = blockArrivalTime.SlotTime
	}
	// Convert blobs
	for clientName, blobArrivalTimes := range arrivalTimes.BlobSeen {
		blobTimingMap := &pb.BlobTimingMap{
			Timings: make(map[int64]int64),
		}
		for _, blob := range blobArrivalTimes.ArrivalTimes {
			blobTimingMap.Timings[blob.BlobIndex] = blob.SlotTime
		}

		timings.BlobSeen[clientName] = blobTimingMap
	}
	for clientName, blobArrivalTimes := range arrivalTimes.BlobFirstSeenP2P {
		blobTimingMap := &pb.BlobTimingMap{
			Timings: make(map[int64]int64),
		}
		for _, blob := range blobArrivalTimes.ArrivalTimes {
			blobTimingMap.Timings[blob.BlobIndex] = blob.SlotTime
		}
		timings.BlobFirstSeenP2P[clientName] = blobTimingMap
	}

	return &pb.BeaconSlotData{
		Slot:             slot,
		Network:          network,
		ProcessedAt:      timestamppb.New(time.Now()),
		ProcessingTimeMs: processingTimeMs,
		Block:            blockData,
		Proposer:         proposerData,
		Entity:           wrapperspb.String(getStringOrNil(entity)),
		Nodes:            nodes,
		Timings:          timings,
		Attestations:     attestations,
	}, nil
}
