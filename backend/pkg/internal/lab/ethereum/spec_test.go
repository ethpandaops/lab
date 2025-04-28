package ethereum

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFetchSpecFromURL(t *testing.T) {
	// This test will actually hit the network to fetch the specification
	// It's more of an integration test than a unit test
	spec, err := FetchSpecFromURL("https://raw.githubusercontent.com/eth-clients/hoodi/refs/heads/main/metadata/config.yaml")
	require.NoError(t, err)
	require.NotNil(t, spec)

	// Verify some basic properties
	assert.Equal(t, "mainnet", spec.PresetBase)
	assert.Equal(t, "hoodi", spec.ConfigName)
	assert.Equal(t, uint64(12), spec.SecondsPerSlot)
	assert.Equal(t, uint64(32), spec.GetSlotsPerEpoch())
	assert.Equal(t, uint64(2048), spec.ElectraForkEpoch)

	// Verify fork states
	assert.True(t, spec.IsForkActive("altair", 0))
	assert.True(t, spec.IsForkActive("bellatrix", 0))
	assert.True(t, spec.IsForkActive("capella", 0))
	assert.True(t, spec.IsForkActive("deneb", 0))
	assert.False(t, spec.IsForkActive("electra", 0))
	assert.True(t, spec.IsForkActive("electra", 2048))
	assert.True(t, spec.IsForkActive("electra", 2049))
}

func TestSpecGetters(t *testing.T) {
	spec := &Spec{
		PresetBase:       "mainnet",
		ConfigName:       "testnet",
		SecondsPerSlot:   6,
		MinGenesisTime:   12345,
		AltairForkEpoch:  0,
		ElectraForkEpoch: 100,
	}

	assert.Equal(t, "mainnet", spec.GetPresetBase())
	assert.Equal(t, "testnet", spec.GetConfigName())
	assert.Equal(t, uint64(6), spec.GetSecondsPerSlot())
	assert.Equal(t, uint64(12345), spec.GetGenesisTimestamp())
	assert.Equal(t, uint64(32), spec.GetSlotsPerEpoch())
	assert.Equal(t, uint64(100), spec.GetElectraForkEpoch())
}
