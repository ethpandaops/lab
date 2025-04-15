package storage

import (
	"bytes"
	"compress/gzip"
	"errors"
	"io"
	"strings"
)

// CompressionAlgorithm represents the type of compression algorithm
type CompressionAlgorithm struct {
	Name            string
	Extension       string
	ContentEncoding string
}

var (
	// Gzip compression algorithm
	Gzip = &CompressionAlgorithm{
		Name:            "gzip",
		Extension:       ".gz",
		ContentEncoding: "gzip",
	}

	// None represents no compression
	None = &CompressionAlgorithm{
		Name:            "none",
		Extension:       "",
		ContentEncoding: "identity",
	}

	// ErrUnsupportedAlgorithm is returned when an unsupported compression algorithm is used
	ErrUnsupportedAlgorithm = errors.New("unsupported compression algorithm")
)

// Compressor provides methods for compressing and decompressing data
type Compressor struct{}

// NewCompressor creates a new Compressor instance
func NewCompressor() *Compressor {
	return &Compressor{}
}

// Compress compresses the input data using the specified algorithm
func (c *Compressor) Compress(data []byte, algorithm *CompressionAlgorithm) ([]byte, error) {
	if algorithm == nil {
		return nil, errors.New("algorithm is nil")
	}

	var buf bytes.Buffer
	var w io.WriteCloser

	switch algorithm.Name {
	case Gzip.Name:
		w = gzip.NewWriter(&buf)
	case None.Name:
		w = nopWriteCloser{&buf}
	default:
		return nil, ErrUnsupportedAlgorithm
	}

	_, err := w.Write(data)
	if err != nil {
		return nil, err
	}

	if err := w.Close(); err != nil {
		return nil, err
	}

	return buf.Bytes(), nil
}

// Decompress decompresses the input data using algorithm determined from filename
func (c *Compressor) Decompress(data []byte, filename string) ([]byte, error) {
	var r io.ReadCloser
	var err error

	algo, err := GetCompressionAlgorithm(filename)
	if err != nil {
		return nil, err
	}

	switch algo.Name {
	case Gzip.Name:
		r, err = gzip.NewReader(bytes.NewReader(data))
	case None.Name:
		r = io.NopCloser(bytes.NewReader(data))
	default:
		return nil, ErrUnsupportedAlgorithm
	}

	if err != nil {
		return nil, err
	}
	defer r.Close()

	return io.ReadAll(r)
}

// AddExtension adds the compression extension to the filename if not already present
func AddExtension(filename string, algorithm *CompressionAlgorithm) string {
	if !strings.HasSuffix(filename, algorithm.Extension) {
		return filename + algorithm.Extension
	}
	return filename
}

// RemoveExtension removes any compression extension from the filename
func RemoveExtension(filename string) string {
	filename = strings.TrimSuffix(filename, Gzip.Extension)
	filename = strings.TrimSuffix(filename, None.Extension)
	return filename
}

// HasCompressionExtension checks if filename has the specified compression extension
func HasCompressionExtension(filename string, algorithm *CompressionAlgorithm) bool {
	return strings.HasSuffix(filename, algorithm.Extension)
}

// HasAnyCompressionExtension checks if filename has any compression extension
func HasAnyCompressionExtension(filename string) bool {
	return strings.HasSuffix(filename, Gzip.Extension) || strings.HasSuffix(filename, None.Extension)
}

// GetCompressionAlgorithm determines the compression algorithm from filename
func GetCompressionAlgorithm(filename string) (*CompressionAlgorithm, error) {
	if strings.HasSuffix(filename, Gzip.Extension) {
		return Gzip, nil
	}

	// Default to no compression for files without compression extension
	return None, nil
}

// GetCompressionAlgorithmFromContentEncoding returns algorithm from Content-Encoding header
func GetCompressionAlgorithmFromContentEncoding(contentEncoding string) (*CompressionAlgorithm, error) {
	if contentEncoding == Gzip.ContentEncoding {
		return Gzip, nil
	}

	if contentEncoding == None.ContentEncoding || contentEncoding == "" {
		return None, nil
	}

	return nil, errors.New("unsupported compression algorithm")
}

// Helper for None compression algorithm
type nopWriteCloser struct {
	io.Writer
}

func (nopWriteCloser) Close() error { return nil }
