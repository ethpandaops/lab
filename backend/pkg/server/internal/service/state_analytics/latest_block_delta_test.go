package state_analytics

import (
	"testing"
)

// TestGetString tests the getString helper function
func TestGetString(t *testing.T) {
	tests := []struct {
		name     string
		input    map[string]interface{}
		key      string
		expected string
	}{
		{
			name:     "valid string",
			input:    map[string]interface{}{"address": "0x1234"},
			key:      "address",
			expected: "0x1234",
		},
		{
			name:     "missing key",
			input:    map[string]interface{}{"other": "value"},
			key:      "address",
			expected: "",
		},
		{
			name:     "wrong type",
			input:    map[string]interface{}{"address": 12345},
			key:      "address",
			expected: "",
		},
		{
			name:     "empty map",
			input:    map[string]interface{}{},
			key:      "address",
			expected: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getString(tt.input, tt.key)
			if result != tt.expected {
				t.Errorf("getString() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

// TestGetUint32 tests the getUint32 helper function
func TestGetUint32(t *testing.T) {
	tests := []struct {
		name     string
		input    map[string]interface{}
		key      string
		expected uint32
	}{
		{
			name:     "uint32 value",
			input:    map[string]interface{}{"count": uint32(100)},
			key:      "count",
			expected: 100,
		},
		{
			name:     "uint64 value",
			input:    map[string]interface{}{"count": uint64(200)},
			key:      "count",
			expected: 200,
		},
		{
			name:     "int value",
			input:    map[string]interface{}{"count": int(300)},
			key:      "count",
			expected: 300,
		},
		{
			name:     "int64 value",
			input:    map[string]interface{}{"count": int64(400)},
			key:      "count",
			expected: 400,
		},
		{
			name:     "float64 value",
			input:    map[string]interface{}{"count": float64(500)},
			key:      "count",
			expected: 500,
		},
		{
			name:     "missing key",
			input:    map[string]interface{}{"other": 123},
			key:      "count",
			expected: 0,
		},
		{
			name:     "wrong type",
			input:    map[string]interface{}{"count": "string"},
			key:      "count",
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getUint32(tt.input, tt.key)
			if result != tt.expected {
				t.Errorf("getUint32() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

// TestGetUint64 tests the getUint64 helper function
func TestGetUint64(t *testing.T) {
	tests := []struct {
		name     string
		input    map[string]interface{}
		key      string
		expected uint64
	}{
		{
			name:     "uint64 value",
			input:    map[string]interface{}{"block": uint64(12345678)},
			key:      "block",
			expected: 12345678,
		},
		{
			name:     "uint32 value",
			input:    map[string]interface{}{"block": uint32(1000)},
			key:      "block",
			expected: 1000,
		},
		{
			name:     "int value",
			input:    map[string]interface{}{"block": int(2000)},
			key:      "block",
			expected: 2000,
		},
		{
			name:     "int64 value",
			input:    map[string]interface{}{"block": int64(3000)},
			key:      "block",
			expected: 3000,
		},
		{
			name:     "float64 value",
			input:    map[string]interface{}{"block": float64(4000)},
			key:      "block",
			expected: 4000,
		},
		{
			name:     "large uint64",
			input:    map[string]interface{}{"block": uint64(18446744073709551615)},
			key:      "block",
			expected: 18446744073709551615,
		},
		{
			name:     "missing key",
			input:    map[string]interface{}{"other": 123},
			key:      "block",
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getUint64(tt.input, tt.key)
			if result != tt.expected {
				t.Errorf("getUint64() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

// TestGetInt64 tests the getInt64 helper function
func TestGetInt64(t *testing.T) {
	tests := []struct {
		name     string
		input    map[string]interface{}
		key      string
		expected int64
	}{
		{
			name:     "int64 value",
			input:    map[string]interface{}{"net_bytes": int64(-1000)},
			key:      "net_bytes",
			expected: -1000,
		},
		{
			name:     "positive int64",
			input:    map[string]interface{}{"net_bytes": int64(2000)},
			key:      "net_bytes",
			expected: 2000,
		},
		{
			name:     "int value",
			input:    map[string]interface{}{"net_bytes": int(3000)},
			key:      "net_bytes",
			expected: 3000,
		},
		{
			name:     "uint64 value",
			input:    map[string]interface{}{"net_bytes": uint64(4000)},
			key:      "net_bytes",
			expected: 4000,
		},
		{
			name:     "uint32 value",
			input:    map[string]interface{}{"net_bytes": uint32(5000)},
			key:      "net_bytes",
			expected: 5000,
		},
		{
			name:     "float64 value",
			input:    map[string]interface{}{"net_bytes": float64(6000)},
			key:      "net_bytes",
			expected: 6000,
		},
		{
			name:     "negative float64",
			input:    map[string]interface{}{"net_bytes": float64(-7000)},
			key:      "net_bytes",
			expected: -7000,
		},
		{
			name:     "missing key",
			input:    map[string]interface{}{"other": 123},
			key:      "net_bytes",
			expected: 0,
		},
		{
			name:     "wrong type",
			input:    map[string]interface{}{"net_bytes": "string"},
			key:      "net_bytes",
			expected: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getInt64(tt.input, tt.key)
			if result != tt.expected {
				t.Errorf("getInt64() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

// TestHelperFunctionsEdgeCases tests edge cases for helper functions
func TestHelperFunctionsEdgeCases(t *testing.T) {
	t.Run("nil map", func(t *testing.T) {
		if getString(nil, "key") != "" {
			t.Error("getString with nil map should return empty string")
		}
		if getUint32(nil, "key") != 0 {
			t.Error("getUint32 with nil map should return 0")
		}
		if getUint64(nil, "key") != 0 {
			t.Error("getUint64 with nil map should return 0")
		}
		if getInt64(nil, "key") != 0 {
			t.Error("getInt64 with nil map should return 0")
		}
	})

	t.Run("nil value", func(t *testing.T) {
		m := map[string]interface{}{"key": nil}

		if getString(m, "key") != "" {
			t.Error("getString with nil value should return empty string")
		}
		if getUint32(m, "key") != 0 {
			t.Error("getUint32 with nil value should return 0")
		}
		if getUint64(m, "key") != 0 {
			t.Error("getUint64 with nil value should return 0")
		}
		if getInt64(m, "key") != 0 {
			t.Error("getInt64 with nil value should return 0")
		}
	})

	t.Run("type conversion accuracy", func(t *testing.T) {
		// Test that large numbers convert correctly
		m := map[string]interface{}{
			"large": uint64(18446744073709551615), // max uint64
		}

		result := getUint64(m, "large")
		if result != 18446744073709551615 {
			t.Errorf("Large uint64 conversion failed: got %v", result)
		}
	})
}

// TestByteCalculations tests the byte calculation logic
func TestByteCalculations(t *testing.T) {
	tests := []struct {
		name             string
		newSlots         uint32
		clearedSlots     uint32
		expectedAdded    uint64
		expectedNet      int64
	}{
		{
			name:             "positive growth",
			newSlots:         1000,
			clearedSlots:     100,
			expectedAdded:    191000,  // 1000 * 191
			expectedNet:      171900,  // (1000 - 100) * 191
		},
		{
			name:             "negative growth",
			newSlots:         100,
			clearedSlots:     500,
			expectedAdded:    19100,   // 100 * 191
			expectedNet:      -76400,  // (100 - 500) * 191
		},
		{
			name:             "no change",
			newSlots:         100,
			clearedSlots:     100,
			expectedAdded:    19100,   // 100 * 191
			expectedNet:      0,       // (100 - 100) * 191
		},
		{
			name:             "only additions",
			newSlots:         500,
			clearedSlots:     0,
			expectedAdded:    95500,   // 500 * 191
			expectedNet:      95500,   // (500 - 0) * 191
		},
		{
			name:             "only removals",
			newSlots:         0,
			clearedSlots:     300,
			expectedAdded:    0,       // 0 * 191
			expectedNet:      -57300,  // (0 - 300) * 191
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			estimatedBytesAdded := uint64(tt.newSlots) * BytesPerSlot
			// Cast to int64 BEFORE subtraction to avoid unsigned underflow
			netStateChangeBytes := (int64(tt.newSlots) - int64(tt.clearedSlots)) * BytesPerSlot

			if estimatedBytesAdded != tt.expectedAdded {
				t.Errorf("estimatedBytesAdded = %v, expected %v", estimatedBytesAdded, tt.expectedAdded)
			}

			if netStateChangeBytes != tt.expectedNet {
				t.Errorf("netStateChangeBytes = %v, expected %v", netStateChangeBytes, tt.expectedNet)
			}
		})
	}
}
