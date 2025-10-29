package state_analytics

import (
	"testing"

	"google.golang.org/protobuf/proto"
)

// TestProtoMessagesCompile verifies that proto messages can be instantiated
func TestProtoMessagesCompile(t *testing.T) {
	t.Run("GetLatestBlockDeltaRequest", func(t *testing.T) {
		req := &GetLatestBlockDeltaRequest{}
		if req == nil {
			t.Error("Failed to create GetLatestBlockDeltaRequest")
		}
	})

	t.Run("GetLatestBlockDeltaResponse", func(t *testing.T) {
		resp := &GetLatestBlockDeltaResponse{
			BlockNumber:           12345,
			NewSlotsCount:         100,
			ModifiedSlotsCount:    50,
			ClearedSlotsCount:     10,
			EstimatedBytesAdded:   19100,
			NetStateChangeBytes:   17190,
		}
		if resp.BlockNumber != 12345 {
			t.Errorf("BlockNumber = %d, expected 12345", resp.BlockNumber)
		}
	})

	t.Run("GetTopStateAddersRequest", func(t *testing.T) {
		req := &GetTopStateAddersRequest{
			Period: GetTopStateAddersRequest_PERIOD_24H,
			Limit:  100,
		}
		if req.Period != GetTopStateAddersRequest_PERIOD_24H {
			t.Error("Failed to set Period enum")
		}
		if req.Limit != 100 {
			t.Error("Failed to set Limit")
		}
	})

	t.Run("ContractStateDelta", func(t *testing.T) {
		delta := &ContractStateDelta{
			Address:       "0x1234567890abcdef",
			NewSlots:      10,
			ModifiedSlots: 5,
			ClearedSlots:  2,
			NetBytes:      1528, // (10-2) * 191
			Label:         "Test Contract",
		}
		if delta.Address != "0x1234567890abcdef" {
			t.Error("Failed to set Address")
		}
	})
}

// TestProtoEnums verifies that enum values are defined correctly
func TestProtoEnums(t *testing.T) {
	t.Run("Period enums", func(t *testing.T) {
		periods := []GetTopStateAddersRequest_Period{
			GetTopStateAddersRequest_PERIOD_UNSPECIFIED,
			GetTopStateAddersRequest_PERIOD_24H,
			GetTopStateAddersRequest_PERIOD_7D,
			GetTopStateAddersRequest_PERIOD_30D,
		}

		for i, period := range periods {
			if int32(period) != int32(i) {
				t.Errorf("Period enum %v has value %d, expected %d", period, period, i)
			}
		}
	})

	t.Run("Granularity enums", func(t *testing.T) {
		granularities := []GetStateGrowthChartRequest_Granularity{
			GetStateGrowthChartRequest_GRANULARITY_UNSPECIFIED,
			GetStateGrowthChartRequest_GRANULARITY_BLOCK,
			GetStateGrowthChartRequest_GRANULARITY_HOUR,
			GetStateGrowthChartRequest_GRANULARITY_DAY,
		}

		for i, gran := range granularities {
			if int32(gran) != int32(i) {
				t.Errorf("Granularity enum %v has value %d, expected %d", gran, gran, i)
			}
		}
	})

	t.Run("EventType enums", func(t *testing.T) {
		events := []ContractStateEvent_EventType{
			ContractStateEvent_EVENT_TYPE_UNSPECIFIED,
			ContractStateEvent_EVENT_TYPE_SLOT_CREATED,
			ContractStateEvent_EVENT_TYPE_SLOT_MODIFIED,
			ContractStateEvent_EVENT_TYPE_SLOT_CLEARED,
		}

		for i, event := range events {
			if int32(event) != int32(i) {
				t.Errorf("EventType enum %v has value %d, expected %d", event, event, i)
			}
		}
	})
}

// TestProtoSerialization verifies that messages can be marshaled and unmarshaled
func TestProtoSerialization(t *testing.T) {
	t.Run("ContractStateDelta", func(t *testing.T) {
		original := &ContractStateDelta{
			Address:       "0xabcdef1234567890",
			NewSlots:      15,
			ModifiedSlots: 8,
			ClearedSlots:  3,
			NetBytes:      2292, // (15-3) * 191
			Label:         "Serialization Test",
		}

		// Marshal to bytes
		data, err := proto.Marshal(original)
		if err != nil {
			t.Fatalf("Failed to marshal: %v", err)
		}

		// Unmarshal back
		restored := &ContractStateDelta{}
		err = proto.Unmarshal(data, restored)
		if err != nil {
			t.Fatalf("Failed to unmarshal: %v", err)
		}

		// Compare fields
		if restored.Address != original.Address {
			t.Errorf("Address mismatch: got %s, expected %s", restored.Address, original.Address)
		}
		if restored.NewSlots != original.NewSlots {
			t.Errorf("NewSlots mismatch: got %d, expected %d", restored.NewSlots, original.NewSlots)
		}
		if restored.Label != original.Label {
			t.Errorf("Label mismatch: got %s, expected %s", restored.Label, original.Label)
		}
	})

	t.Run("StateGrowthDataPoint", func(t *testing.T) {
		original := &StateGrowthDataPoint{
			BlockNumber:  12345678,
			SlotsAdded:   1000,
			SlotsCleared: 50,
			NetSlots:     950,
			BytesAdded:   191000,
			BytesCleared: 9550,
			NetBytes:     181450,
		}

		data, err := proto.Marshal(original)
		if err != nil {
			t.Fatalf("Failed to marshal: %v", err)
		}

		restored := &StateGrowthDataPoint{}
		err = proto.Unmarshal(data, restored)
		if err != nil {
			t.Fatalf("Failed to unmarshal: %v", err)
		}

		if restored.BlockNumber != original.BlockNumber {
			t.Errorf("BlockNumber mismatch: got %d, expected %d", restored.BlockNumber, original.BlockNumber)
		}
		if restored.NetBytes != original.NetBytes {
			t.Errorf("NetBytes mismatch: got %d, expected %d", restored.NetBytes, original.NetBytes)
		}
	})
}

// TestResponseStructures verifies that response structures have expected fields
func TestResponseStructures(t *testing.T) {
	t.Run("GetTopStateAddersResponse", func(t *testing.T) {
		resp := &GetTopStateAddersResponse{
			Adders: []*StateAdder{
				{
					Rank:                 1,
					Address:              "0xtest1",
					SlotsAdded:           1000,
					EstimatedBytesAdded:  191000,
					Category:             "ERC20",
					Label:                "Test Token",
					PercentageOfTotal:    5.5,
				},
				{
					Rank:                 2,
					Address:              "0xtest2",
					SlotsAdded:           500,
					EstimatedBytesAdded:  95500,
					Category:             "NFT",
					Label:                "Test NFT",
					PercentageOfTotal:    2.75,
				},
			},
			StartBlock: 12340000,
			EndBlock:   12347200,
		}

		if len(resp.Adders) != 2 {
			t.Errorf("Expected 2 adders, got %d", len(resp.Adders))
		}

		if resp.Adders[0].Rank != 1 {
			t.Error("First adder should have rank 1")
		}

		if resp.StartBlock >= resp.EndBlock {
			t.Error("StartBlock should be less than EndBlock")
		}
	})

	t.Run("GetStateGrowthChartResponse", func(t *testing.T) {
		resp := &GetStateGrowthChartResponse{
			DataPoints: []*StateGrowthDataPoint{
				{BlockNumber: 1, NetBytes: 100},
				{BlockNumber: 2, NetBytes: 200},
				{BlockNumber: 3, NetBytes: 300},
			},
			Summary: &StateSummary{
				TotalSlotsAdded:   3000,
				TotalSlotsCleared: 500,
				NetSlots:          2500,
				TotalBytesAdded:   573000,
				TotalBytesCleared: 95500,
				NetBytes:          477500,
				AvgSlotsPerBlock:  833.33,
			},
		}

		if len(resp.DataPoints) != 3 {
			t.Errorf("Expected 3 data points, got %d", len(resp.DataPoints))
		}

		if resp.Summary == nil {
			t.Error("Summary should not be nil")
		}

		expectedNetSlots := int64(resp.Summary.TotalSlotsAdded) - int64(resp.Summary.TotalSlotsCleared)
		if resp.Summary.NetSlots != expectedNetSlots {
			t.Error("NetSlots should equal TotalSlotsAdded - TotalSlotsCleared")
		}
	})
}

// TestFieldDefaults verifies default values for proto fields
func TestFieldDefaults(t *testing.T) {
	t.Run("Empty request has zero values", func(t *testing.T) {
		req := &GetTopStateAddersRequest{}
		if req.Period != GetTopStateAddersRequest_PERIOD_UNSPECIFIED {
			t.Error("Default Period should be PERIOD_UNSPECIFIED")
		}
		if req.Limit != 0 {
			t.Error("Default Limit should be 0")
		}
	})

	t.Run("Empty ContractStateDelta", func(t *testing.T) {
		delta := &ContractStateDelta{}
		if delta.Address != "" {
			t.Error("Default Address should be empty string")
		}
		if delta.NewSlots != 0 {
			t.Error("Default NewSlots should be 0")
		}
	})
}
