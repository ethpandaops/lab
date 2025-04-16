package beacon_chain_timings

import (
	"time"

	pb "github.com/ethpandaops/lab/pkg/server/proto/beacon_chain_timings"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// GetStateKey returns the state key for the beacon chain timings
func GetStateKey() string {
	return "state"
}

// NewState creates a new, initialized state object
func NewState() *pb.State {
	return &pb.State{
		BlockTimings: &pb.DataTypeState{
			LastProcessed: make(map[string]*timestamppb.Timestamp),
		},
		Cdf: &pb.DataTypeState{
			LastProcessed: make(map[string]*timestamppb.Timestamp),
		},
	}
}

// TimestampFromTime converts a time.Time to a proto timestamp
func TimestampFromTime(t time.Time) *timestamppb.Timestamp {
	if t.IsZero() {
		return &timestamppb.Timestamp{}
	}
	return timestamppb.New(t)
}

// TimeFromTimestamp safely converts a proto timestamp to time.Time
func TimeFromTimestamp(ts *timestamppb.Timestamp) time.Time {
	if ts == nil || !ts.IsValid() {
		return time.Time{}
	}
	return ts.AsTime()
}
