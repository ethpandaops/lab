package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/sirupsen/logrus"
)

// WithRecovery adds panic recovery middleware
func WithRecovery(log logrus.FieldLogger) func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if err := recover(); err != nil {
					// Log the panic with stack trace
					log.WithFields(logrus.Fields{
						"error":  err,
						"stack":  string(debug.Stack()),
						"method": r.Method,
						"path":   r.URL.Path,
					}).Error("Panic recovered in REST API handler")

					// Return 500 Internal Server Error
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)

					// Write error response
					errorMsg := `{"error":"Internal Server Error","message":"An unexpected error occurred","code":500}`
					if _, err := w.Write([]byte(errorMsg)); err != nil {
						log.WithError(err).Error("Failed to write panic recovery response")
					}
				}
			}()

			next(w, r)
		}
	}
}
