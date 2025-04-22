package beacon_slots

import (
	"sort"
	"strings"
	"time"

	"github.com/attestantio/go-eth2-client/spec/phase0"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/geolocation"
	pb "github.com/ethpandaops/lab/backend/pkg/server/proto/beacon_slots"
)

// transformSlotDataForStorage transforms slot data into optimized format for storage
func (b *BeaconSlots) transformSlotDataForStorage(
	slot phase0.Slot,
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
			// Extract username from the client name (first part before first slash)
			extractedUsername := name
			if parts := strings.Split(name, "/"); len(parts) > 0 {
				extractedUsername = parts[0]
			}

			geo := &pb.Geo{
				City:      city,
				Country:   country,
				Continent: continent,
			}

			if lat != nil {
				geo.Latitude = *lat
			}

			if lon != nil {
				geo.Longitude = *lon
			}

			nodes[name] = &pb.Node{
				Name:     name,
				Username: extractedUsername,
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

	// Sort attestation windows by start time
	sort.Slice(attestationWindows, func(i, j int) bool {
		return attestationWindows[i].StartMs < attestationWindows[j].StartMs
	})

	attestations := &pb.AttestationsData{
		Windows:      attestationWindows,
		MaximumVotes: maximumAttestationVotes,
	}

	// Convert to SlimTimings so we drop the redundant data.
	timings := &pb.SlimTimings{
		// Initialize all maps to prevent nil map panics
		BlockSeen:         make(map[string]int64),
		BlockFirstSeenP2P: make(map[string]int64),
		BlobSeen:          make(map[string]*pb.BlobTimingMap),
		BlobFirstSeenP2P:  make(map[string]*pb.BlobTimingMap),
	}

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
		Slot:             int64(slot), //nolint:gosec // no risk of overflow
		Network:          network,
		ProcessedAt:      time.Now().UTC().Format(time.RFC3339),
		ProcessingTimeMs: processingTimeMs,
		Block:            blockData,
		Proposer:         proposerData,
		Entity:           getStringOrNil(entity),
		Nodes:            nodes,
		Timings:          timings,
		Attestations:     attestations,
	}, nil
}

// lookupGeoCoordinates performs a geo lookup for given city/country.
func (b *BeaconSlots) lookupGeoCoordinates(city, country string) (*float64, *float64) {
	location, found := b.geolocationClient.LookupCity(geolocation.LookupParams{
		City:    city,
		Country: country,
	})

	if !found {
		return nil, nil
	}

	return &location.Lat, &location.Lon
}
