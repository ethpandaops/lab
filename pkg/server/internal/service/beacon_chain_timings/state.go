package beacon_chain_timings

import "time"

type DataTypeState struct {
	LastProcessed map[string]time.Time `json:"last_processed"`
}

type State struct {
	BlockTimings DataTypeState `json:"block_timings"`
	Cdf          DataTypeState `json:"cdf"`
}

func GetStateKey() string {
	return "state.json"
}
