package storage

import (
	"encoding/json"
	"fmt"

	"gopkg.in/yaml.v3"
)

// Encoder is an interface for encoding data
type Encoder interface {
	// Encode encodes a value into bytes
	Encode(v any) ([]byte, error)
	// FileExtension returns the file extension for this encoder
	FileExtension() string
	// GetContentType returns the content type for this encoder
	GetContentType() string
}

// Decoder is an interface for decoding data
type Decoder interface {
	// Decode decodes bytes into a value
	Decode(data []byte, v any) error
}

// Codec combines encoder and decoder interfaces
type Codec interface {
	Encoder
	Decoder
}

// Registry is a registry of encoders and decoders
type Registry struct {
	codecs map[CodecName]Codec
}

type CodecName string

const (
	CodecNameJSON CodecName = "json"
	CodecNameYAML CodecName = "yaml"
)

// NewRegistry creates a new registry with standard codecs
func NewRegistry() *Registry {
	r := &Registry{
		codecs: make(map[CodecName]Codec),
	}

	// Register standard codecs
	r.Register(CodecNameJSON, &JSONCodec{})
	r.Register(CodecNameYAML, &YAMLCodec{})

	return r
}

// Register registers a codec with the registry
func (r *Registry) Register(name CodecName, codec Codec) {
	r.codecs[name] = codec
}

// Get returns a codec by name
func (r *Registry) Get(name CodecName) (Codec, error) {
	codec, ok := r.codecs[name]
	if !ok {
		return nil, fmt.Errorf("unknown encoding format: %s", name)
	}

	return codec, nil
}

// JSONCodec implements Codec for JSON encoding
type JSONCodec struct{}

func (c *JSONCodec) Encode(v any) ([]byte, error) {
	return json.Marshal(v)
}

func (c *JSONCodec) Decode(data []byte, v any) error {
	return json.Unmarshal(data, v)
}

func (c *JSONCodec) FileExtension() string {
	return string(CodecNameJSON)
}

func (c *JSONCodec) GetContentType() string {
	return "application/json"
}

// YAMLCodec implements Codec for YAML encoding
type YAMLCodec struct{}

func (c *YAMLCodec) Encode(v any) ([]byte, error) {
	return yaml.Marshal(v)
}

func (c *YAMLCodec) Decode(data []byte, v any) error {
	return yaml.Unmarshal(data, v)
}

func (c *YAMLCodec) FileExtension() string {
	return string(CodecNameYAML)
}

func (c *YAMLCodec) GetContentType() string {
	return "application/yaml"
}
