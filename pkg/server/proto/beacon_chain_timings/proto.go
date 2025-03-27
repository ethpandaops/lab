package beacon_chain_timings

import (
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// ConvertTimeWindowConfigToProto converts a TimeWindowConfig to proto format
func ConvertTimeWindowConfigToProto(config *TimeWindowConfig) *TimeWindowConfig {
	return &TimeWindowConfig{
		Name:    config.Name,
		File:    config.File,
		RangeMs: config.RangeMs,
		StepMs:  config.StepMs,
	}
}

// ConvertProtoToTimeWindowConfig converts a proto TimeWindowConfig to Go struct
func ConvertProtoToTimeWindowConfig(config *TimeWindowConfig) *TimeWindowConfig {
	return &TimeWindowConfig{
		Name:    config.Name,
		File:    config.File,
		RangeMs: config.RangeMs,
		StepMs:  config.StepMs,
	}
}

// ConvertProcessorStateToProto converts a ProcessorState to proto format
func ConvertProcessorStateToProto(state *ProcessorState) *ProcessorState {
	return &ProcessorState{
		Network:       state.Network,
		LastProcessed: state.LastProcessed,
	}
}

// ConvertProtoToProcessorState converts a proto ProcessorState to Go struct
func ConvertProtoToProcessorState(state *ProcessorState) *ProcessorState {
	return &ProcessorState{
		Network:       state.Network,
		LastProcessed: state.LastProcessed,
	}
}

// ConvertTimingDataToProto converts a TimingData to proto format
func ConvertTimingDataToProto(data *TimingData) *TimingData {
	protoData := &TimingData{
		Network:    data.Network,
		Timestamp:  timestamppb.New(data.Timestamp.AsTime()),
		Timestamps: data.Timestamps,
		Mins:       data.Mins,
		Maxs:       data.Maxs,
		Avgs:       data.Avgs,
		P05S:       data.P05S,
		P50S:       data.P50S,
		P95S:       data.P95S,
		Blocks:     data.Blocks,
		Validators: make(map[string]*TimingData_ValidatorCategory),
	}

	for validator, categories := range data.Validators {
		validatorCategory := &TimingData_ValidatorCategory{
			Categories: make(map[string]int32),
		}

		for category, count := range categories.Categories {
			validatorCategory.Categories[category] = int32(count)
		}

		protoData.Validators[validator] = validatorCategory
	}

	return protoData
}

// ConvertProtoToTimingData converts a proto TimingData to Go struct
func ConvertProtoToTimingData(data *TimingData) *TimingData {
	timingData := &TimingData{
		Network:    data.Network,
		Timestamp:  timestamppb.New(data.Timestamp.AsTime()),
		Timestamps: data.Timestamps,
		Mins:       data.Mins,
		Maxs:       data.Maxs,
		Avgs:       data.Avgs,
		P05S:       data.P05S,
		P50S:       data.P50S,
		P95S:       data.P95S,
		Blocks:     data.Blocks,
		Validators: make(map[string]*TimingData_ValidatorCategory),
	}

	for validator, categories := range data.Validators {
		timingData.Validators[validator] = &TimingData_ValidatorCategory{
			Categories: make(map[string]int32),
		}

		for category, count := range categories.Categories {
			timingData.Validators[validator].Categories[category] = int32(count)
		}
	}

	return timingData
}

// ConvertSizeCDFDataToProto converts a SizeCDFData to proto format
func ConvertSizeCDFDataToProto(data *SizeCDFData) *SizeCDFData {
	protoData := &SizeCDFData{
		Network:        data.Network,
		Timestamp:      timestamppb.New(data.Timestamp.AsTime()),
		SizesKb:        data.SizesKb,
		Mev:            data.Mev,
		NonMev:         data.NonMev,
		SoloMev:        data.SoloMev,
		SoloNonMev:     data.SoloNonMev,
		All:            data.All,
		ArrivalTimesMs: make(map[string]*SizeCDFData_DoubleList),
	}

	for size, times := range data.ArrivalTimesMs {
		protoData.ArrivalTimesMs[size] = &SizeCDFData_DoubleList{
			Values: times.Values,
		}
	}

	return protoData
}

// ConvertProtoToSizeCDFData converts a proto SizeCDFData to Go struct
func ConvertProtoToSizeCDFData(data *SizeCDFData) *SizeCDFData {
	sizeCDFData := &SizeCDFData{
		Network:        data.Network,
		Timestamp:      timestamppb.New(data.Timestamp.AsTime()),
		SizesKb:        data.SizesKb,
		Mev:            data.Mev,
		NonMev:         data.NonMev,
		SoloMev:        data.SoloMev,
		SoloNonMev:     data.SoloNonMev,
		All:            data.All,
		ArrivalTimesMs: make(map[string]*SizeCDFData_DoubleList),
	}

	for size, times := range data.ArrivalTimesMs {
		sizeCDFData.ArrivalTimesMs[size] = &SizeCDFData_DoubleList{
			Values: times.Values,
		}
	}

	return sizeCDFData
}

// ConvertDataProcessorParamsToProto converts DataProcessorParams to proto format
func ConvertDataProcessorParamsToProto(params *DataProcessorParams) *DataProcessorParams {
	return &DataProcessorParams{
		NetworkName: params.NetworkName,
		WindowName:  params.WindowName,
	}
}

// ConvertProtoToDataProcessorParams converts proto DataProcessorParams to Go struct
func ConvertProtoToDataProcessorParams(params *DataProcessorParams) DataProcessorParams {
	return DataProcessorParams{
		NetworkName: params.NetworkName,
		WindowName:  params.WindowName,
	}
}

// ConvertBlockTimingsProcessorParamsToProto converts BlockTimingsProcessorParams to proto format
func ConvertBlockTimingsProcessorParamsToProto(params *BlockTimingsProcessorParams) *BlockTimingsProcessorParams {
	return &BlockTimingsProcessorParams{
		NetworkName: params.NetworkName,
	}
}

// ConvertProtoToBlockTimingsProcessorParams converts proto BlockTimingsProcessorParams to Go struct
func ConvertProtoToBlockTimingsProcessorParams(params *BlockTimingsProcessorParams) BlockTimingsProcessorParams {
	return BlockTimingsProcessorParams{
		NetworkName: params.NetworkName,
	}
}

// ConvertSizeCDFProcessorParamsToProto converts SizeCDFProcessorParams to proto format
func ConvertSizeCDFProcessorParamsToProto(params *SizeCDFProcessorParams) *SizeCDFProcessorParams {
	return &SizeCDFProcessorParams{
		NetworkName: params.NetworkName,
	}
}

// ConvertProtoToSizeCDFProcessorParams converts proto SizeCDFProcessorParams to Go struct
func ConvertProtoToSizeCDFProcessorParams(params *SizeCDFProcessorParams) SizeCDFProcessorParams {
	return SizeCDFProcessorParams{
		NetworkName: params.NetworkName,
	}
}

// ProtoToJSON converts a protobuf message to a JSON string
func ProtoToJSON(v proto.Message) (string, error) {
	marshaler := protojson.MarshalOptions{
		UseProtoNames: true,
	}
	bytes, err := marshaler.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// JSONToProto converts a JSON string to a protobuf message
func JSONToProto(jsonStr string, v proto.Message) error {
	return protojson.Unmarshal([]byte(jsonStr), v)
}

// ProtoTimingDataToJSON converts a TimingData proto to a JSON string
func ProtoTimingDataToJSON(data *TimingData) (string, error) {
	return ProtoToJSON(data)
}

// ProtoSizeCDFDataToJSON converts a SizeCDFData proto to a JSON string
func ProtoSizeCDFDataToJSON(data *SizeCDFData) (string, error) {
	return ProtoToJSON(data)
}
