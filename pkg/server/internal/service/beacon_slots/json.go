package beacon_slots

import (
	"fmt"

	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/proto"
)

// ToJSON marshals a proto.Message to JSON using protojson with correct options.
func ToJSON(msg proto.Message) (string, error) {
	marshaller := protojson.MarshalOptions{
		UseProtoNames:   true,
		EmitUnpopulated: true,
	}
	bytes, err := marshaller.Marshal(msg)
	if err != nil {
		return "", fmt.Errorf("failed to marshal proto message: %w", err)
	}
	return string(bytes), nil
}

// FromJSON unmarshals JSON to a proto.Message using protojson.
func FromJSON(jsonData string, msg proto.Message) error {
	unmarshaller := protojson.UnmarshalOptions{
		DiscardUnknown: true,
	}
	return unmarshaller.Unmarshal([]byte(jsonData), msg)
}
