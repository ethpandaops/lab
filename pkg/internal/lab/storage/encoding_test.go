package storage

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestRegistry(t *testing.T) {
	// Create a new registry
	registry := NewRegistry()

	// Test that we can get existing codecs
	jsonCodec, err := registry.Get(CodecNameJSON)
	require.NoError(t, err)
	assert.NotNil(t, jsonCodec)
	assert.Equal(t, "json", jsonCodec.FileExtension())

	yamlCodec, err := registry.Get(CodecNameYAML)
	require.NoError(t, err)
	assert.NotNil(t, yamlCodec)
	assert.Equal(t, "yaml", yamlCodec.FileExtension())

	// Test that we get an error for unknown codecs
	_, err = registry.Get(CodecName("unknown"))
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "unknown encoding format")

	// Test registering a custom codec
	customCodec := &customTestCodec{}
	customCodecName := CodecName("custom")
	registry.Register(customCodecName, customCodec)

	// Test that we can get the custom codec
	retrievedCodec, err := registry.Get(customCodecName)
	require.NoError(t, err)
	assert.Equal(t, customCodec, retrievedCodec)
}

func TestJSONCodec(t *testing.T) {
	codec := &JSONCodec{}

	// Test structure
	type TestStruct struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	// Test data
	testData := TestStruct{
		Name:  "test",
		Value: 42,
	}

	// Test encoding
	encoded, err := codec.Encode(testData)
	require.NoError(t, err)
	assert.NotEmpty(t, encoded)

	// Test decoding
	var decoded TestStruct
	err = codec.Decode(encoded, &decoded)
	require.NoError(t, err)
	assert.Equal(t, testData, decoded)

	// Test file extension
	assert.Equal(t, "json", codec.FileExtension())
}

func TestYAMLCodec(t *testing.T) {
	codec := &YAMLCodec{}

	// Test structure
	type TestStruct struct {
		Name  string `yaml:"name"`
		Value int    `yaml:"value"`
	}

	// Test data
	testData := TestStruct{
		Name:  "test",
		Value: 42,
	}

	// Test encoding
	encoded, err := codec.Encode(testData)
	require.NoError(t, err)
	assert.NotEmpty(t, encoded)

	// Test decoding
	var decoded TestStruct
	err = codec.Decode(encoded, &decoded)
	require.NoError(t, err)
	assert.Equal(t, testData, decoded)

	// Test file extension
	assert.Equal(t, "yaml", codec.FileExtension())
}

// Custom test codec for testing registry
type customTestCodec struct{}

func (c *customTestCodec) Encode(v any) ([]byte, error) {
	return []byte("custom"), nil
}

func (c *customTestCodec) Decode(data []byte, v any) error {
	return nil
}

func (c *customTestCodec) FileExtension() string {
	return "custom"
}
