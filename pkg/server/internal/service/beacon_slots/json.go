package beacon_slots

import (
	"encoding/json"
)

// ToJSON marshals a struct to JSON
func ToJSON(data interface{}) (string, error) {
	bytes, err := json.Marshal(data)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// FromJSON unmarshals JSON to a struct
func FromJSON(jsonData string, data interface{}) error {
	return json.Unmarshal([]byte(jsonData), data)
}
