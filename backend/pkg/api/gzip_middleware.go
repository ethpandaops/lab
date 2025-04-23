package api

import (
	"bufio"
	"compress/gzip"
	"io"
	"net"
	"net/http"
	"strings"
	"sync"
)

const (
	// DefaultCompression is the default compression level to use
	DefaultCompression = gzip.DefaultCompression
	// BestCompression is the best compression level to use
	BestCompression = gzip.BestCompression
	// BestSpeed is the fastest compression level to use
	BestSpeed = gzip.BestSpeed
	// NoCompression disables compression
	NoCompression = gzip.NoCompression
)

var (
	// Compression level to use for gzip compression
	compressionLevel = DefaultCompression

	// Common compressible content types
	compressibleContentTypes = []string{
		"application/json",
		"application/javascript",
		"application/xml",
		"text/html",
		"text/css",
		"text/javascript",
		"text/plain",
		"text/xml",
	}

	// Common already compressed file extensions to skip
	skipCompressedExtensions = []string{
		".gz", ".zip", ".rar", ".7z", ".bz2", ".xz", ".mp3", ".mp4",
		".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".doc", ".docx",
	}
)

type gzipResponseWriter struct {
	http.ResponseWriter
	gzWriter       *gzip.Writer
	wroteHeader    bool
	shouldCompress bool
}

var gzipWriterPool = sync.Pool{
	New: func() interface{} {
		gz, err := gzip.NewWriterLevel(io.Discard, compressionLevel)
		if err != nil {
			panic(err)
		}
		return gz
	},
}

// GzipMiddleware returns a middleware that compresses HTTP responses using gzip compression
func GzipMiddleware(level int) func(http.Handler) http.Handler {
	compressionLevel = level

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if !shouldCompress(r) {
				next.ServeHTTP(w, r)
				return
			}

			gz := gzipWriterPool.Get().(*gzip.Writer)
			defer gzipWriterPool.Put(gz)
			gz.Reset(w)

			gzw := &gzipResponseWriter{
				ResponseWriter: w,
				gzWriter:       gz,
				shouldCompress: true,
			}
			defer gz.Close()

			next.ServeHTTP(gzw, r)
		})
	}
}

// shouldCompress returns true if the request should be compressed
func shouldCompress(r *http.Request) bool {
	// Check if client accepts gzip encoding
	if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
		return false
	}

	// Don't compress if already compressed
	if strings.Contains(r.Header.Get("Content-Encoding"), "gzip") {
		return false
	}

	// Skip certain file extensions that are already compressed
	for _, ext := range skipCompressedExtensions {
		if strings.HasSuffix(r.URL.Path, ext) {
			return false
		}
	}

	return true
}

// Write implements http.ResponseWriter
func (gzw *gzipResponseWriter) Write(b []byte) (int, error) {
	if !gzw.wroteHeader {
		gzw.WriteHeader(http.StatusOK)
	}

	if !gzw.shouldCompress {
		return gzw.ResponseWriter.Write(b)
	}

	return gzw.gzWriter.Write(b)
}

// WriteHeader implements http.ResponseWriter
func (gzw *gzipResponseWriter) WriteHeader(statusCode int) {
	if gzw.wroteHeader {
		return
	}

	// Set Vary header to advertise content negotiation
	gzw.ResponseWriter.Header().Add("Vary", "Accept-Encoding")

	if gzw.shouldCompress {
		// Check if the content type is compressible
		contentType := gzw.ResponseWriter.Header().Get("Content-Type")
		isCompressible := false

		for _, ct := range compressibleContentTypes {
			if strings.Contains(contentType, ct) {
				isCompressible = true
				break
			}
		}

		if !isCompressible {
			gzw.shouldCompress = false
		}
	}

	// If compression is still enabled, set the Content-Encoding header
	if gzw.shouldCompress {
		gzw.ResponseWriter.Header().Set("Content-Encoding", "gzip")
		// Remove Content-Length as it will be different after compression
		gzw.ResponseWriter.Header().Del("Content-Length")
	}

	gzw.ResponseWriter.WriteHeader(statusCode)
	gzw.wroteHeader = true
}

// Flush implements http.Flusher interface
func (gzw *gzipResponseWriter) Flush() {
	if gzw.shouldCompress {
		gzw.gzWriter.Flush()
	}

	if flusher, ok := gzw.ResponseWriter.(http.Flusher); ok {
		flusher.Flush()
	}
}

// Hijack implements http.Hijacker interface
func (gzw *gzipResponseWriter) Hijack() (net.Conn, *bufio.ReadWriter, error) {
	if hijacker, ok := gzw.ResponseWriter.(http.Hijacker); ok {
		return hijacker.Hijack()
	}
	return nil, nil, http.ErrNotSupported
}

// CloseNotify implements http.CloseNotifier interface
func (gzw *gzipResponseWriter) CloseNotify() <-chan bool {
	if closeNotifier, ok := gzw.ResponseWriter.(http.CloseNotifier); ok {
		return closeNotifier.CloseNotify()
	}
	return nil
}
