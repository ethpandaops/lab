package timings

import (
	"encoding/json"
	"time"
)

// TimeWindowConfig represents a time window for processing
type TimeWindowConfig struct {
	Name  string        `json:"name"`
	File  string        `json:"file"`
	Range time.Duration `json:"range"`
	Step  time.Duration `json:"step"`
}

// ProcessorState tracks the processing state for a specific processor
type ProcessorState struct {
	Network       string    `json:"network"`
	LastProcessed time.Time `json:"last_processed"`
}

// TimingData represents block timing statistics in time windows
type TimingData struct {
	Network    string                    `json:"network"`
	TimeStamp  time.Time                 `json:"timestamp"`
	Timestamps []int64                   `json:"timestamps"`
	Mins       []float64                 `json:"mins"`
	Maxs       []float64                 `json:"maxs"`
	Avgs       []float64                 `json:"avgs"`
	P05s       []float64                 `json:"p05s"`
	P50s       []float64                 `json:"p50s"`
	P95s       []float64                 `json:"p95s"`
	Blocks     []int64                   `json:"blocks"`
	Validators map[string]map[string]int `json:"validators"` // validator -> timing category -> count
}

// SizeCDFData represents size CDF (Cumulative Distribution Function) data
type SizeCDFData struct {
	Network        string               `json:"network"`
	TimeStamp      time.Time            `json:"timestamp"`
	SizesKB        []int64              `json:"sizes_kb"`
	MEV            map[string]float64   `json:"mev"`
	NonMEV         map[string]float64   `json:"non_mev"`
	SoloMEV        map[string]float64   `json:"solo_mev"`
	SoloNonMEV     map[string]float64   `json:"solo_non_mev"`
	All            map[string]float64   `json:"all"`
	ArrivalTimesMs map[string][]float64 `json:"arrival_times_ms"`
}

// DataProcessorParams are the parameters for data processor workflows
type DataProcessorParams struct {
	NetworkName string
	WindowName  string
}

// BlockTimingsProcessorParams are the parameters for the block timings processor
type BlockTimingsProcessorParams struct {
	NetworkName string
}

// SizeCDFProcessorParams are the parameters for the size CDF processor
type SizeCDFProcessorParams struct {
	NetworkName string
}

// ToJSON converts a struct to a JSON string
func ToJSON(v interface{}) (string, error) {
	bytes, err := json.Marshal(v)
	if err != nil {
		return "", err
	}
	return string(bytes), nil
}

// FromJSON converts a JSON string to a struct
func FromJSON(jsonStr string, v interface{}) error {
	return json.Unmarshal([]byte(jsonStr), v)
}

// ToJSON converts TimingData to a JSON string
func (t *TimingData) ToJSON() (string, error) {
	return ToJSON(t)
}

// ToJSON converts SizeCDFData to a JSON string
func (s *SizeCDFData) ToJSON() (string, error) {
	return ToJSON(s)
}
