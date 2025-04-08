package beacon_chain_timings

import (
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

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
