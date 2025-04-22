package beacon_slots

import (
	"encoding/json"
	"fmt"
	"strconv"
)

// MarshalJSON implements custom JSON marshaling for BlobTimingMap
// It directly flattens the timings map for backward compatibility with older clients
func (m *BlobTimingMap) MarshalJSON() ([]byte, error) {
	if m == nil || m.Timings == nil {
		return []byte("{}"), nil
	}

	// Create a flat map for JSON encoding
	flat := make(map[string]int64, len(m.Timings))
	for k, v := range m.Timings {
		flat[fmt.Sprintf("%d", k)] = v
	}

	return json.Marshal(flat)
}

// UnmarshalJSON implements custom JSON unmarshaling for BlobTimingMap
// It supports both the nested "timings" format and the flat format
func (m *BlobTimingMap) UnmarshalJSON(data []byte) error {
	// First try to unmarshal as a flat map (the old format)
	var flatMap map[string]int64
	if err := json.Unmarshal(data, &flatMap); err == nil {
		m.Timings = make(map[int64]int64, len(flatMap))
		for k, v := range flatMap {
			// Convert string keys like "0", "1" to int64
			if i, err := strconv.ParseInt(k, 10, 64); err == nil {
				m.Timings[i] = v
			}
		}
		return nil
	}

	// If that fails, try the nested format
	var nested struct {
		Timings map[string]int64 `json:"timings"`
	}
	if err := json.Unmarshal(data, &nested); err == nil && nested.Timings != nil {
		m.Timings = make(map[int64]int64, len(nested.Timings))
		for k, v := range nested.Timings {
			if i, err := strconv.ParseInt(k, 10, 64); err == nil {
				m.Timings[i] = v
			}
		}
		return nil
	}

	// If both approaches fail, return empty but valid map
	m.Timings = map[int64]int64{}
	return nil
}
