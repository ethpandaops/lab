package middleware

import (
	"net/http"
	"time"

	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
)

// responseWriter wraps http.ResponseWriter to capture status code
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{
		ResponseWriter: w,
		statusCode:     http.StatusOK,
	}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// WithLogging adds request logging middleware
func WithLogging(log logrus.FieldLogger) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			wrapped := newResponseWriter(w)

			// Extract route variables for better logging
			vars := mux.Vars(r)
			fields := logrus.Fields{
				"method": r.Method,
				"path":   r.URL.Path,
				"remote": r.RemoteAddr,
			}

			// Add network if present
			if network := vars["network"]; network != "" {
				fields["network"] = network
			}

			// Add other common path params
			if slot := vars["slot"]; slot != "" {
				fields["slot"] = slot
			}

			if experimentID := vars["experimentId"]; experimentID != "" {
				fields["experiment_id"] = experimentID
			}

			// Log the request
			log.WithFields(fields).Debug("REST API request")

			// Process request
			next(wrapped, r)

			// Log the response
			duration := time.Since(start)
			fields["status"] = wrapped.statusCode
			fields["duration_ms"] = duration.Milliseconds()

			// Choose log level based on status code
			logger := log.WithFields(fields)

			switch {
			case wrapped.statusCode >= 500:
				logger.Error("REST API error response")
			case wrapped.statusCode >= 400:
				logger.Warn("REST API client error")
			case wrapped.statusCode >= 300:
				logger.Debug("REST API redirect")
			default:
				logger.Debug("REST API response")
			}
		}
	}
}
