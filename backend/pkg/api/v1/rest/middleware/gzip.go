package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
	"sync"

	"github.com/sirupsen/logrus"
)

const (
	// MinGzipSize is the minimum size in bytes for gzip compression to be applied.
	// Compressing very small responses isn't worth the CPU overhead.
	MinGzipSize = 860

	// DefaultGzipLevel uses the default compression level for balance between speed and size.
	DefaultGzipLevel = gzip.DefaultCompression
)

// Pool of gzip writers to reduce allocations.
var gzipPool = sync.Pool{
	New: func() interface{} {
		w, err := gzip.NewWriterLevel(nil, DefaultGzipLevel)
		if err != nil {
			// Fall back to default compression if level is invalid
			w = gzip.NewWriter(nil)
		}

		return w
	},
}

// gzipResponseWriter wraps http.ResponseWriter to provide gzip compression.
type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
	headerWritten bool
}

// Write writes the data to the connection as part of an HTTP reply.
func (w *gzipResponseWriter) Write(b []byte) (int, error) {
	if !w.headerWritten {
		// Set content encoding header before first write
		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Del("Content-Length") // Remove content-length as it will change
		w.headerWritten = true
	}

	return w.Writer.Write(b)
}

// WriteHeader sends an HTTP response header with the provided status code.
func (w *gzipResponseWriter) WriteHeader(code int) {
	if !w.headerWritten {
		w.Header().Del("Content-Length") // Remove content-length as it will change
		w.headerWritten = true
	}

	w.ResponseWriter.WriteHeader(code)
}

// WithGzip returns a middleware that compresses HTTP responses using gzip.
// It only compresses if the client supports gzip encoding and the response is JSON.
func WithGzip(log logrus.FieldLogger) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			// Check if client accepts gzip encoding
			if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
				next(w, r)

				return
			}

			// Only compress JSON responses
			gz, ok := gzipPool.Get().(*gzip.Writer)
			if !ok {
				log.Error("Failed to get gzip writer from pool")
				next(w, r)

				return
			}
			defer gzipPool.Put(gz)

			gz.Reset(w)

			defer func() {
				if err := gz.Close(); err != nil {
					log.WithError(err).Debug("Failed to close gzip writer")
				}
			}()

			w.Header().Set("Vary", "Accept-Encoding")
			w.Header().Set("Content-Encoding", "gzip")

			gzw := &gzipResponseWriter{
				Writer:         gz,
				ResponseWriter: w,
			}

			next(gzw, r)
		}
	}
}
