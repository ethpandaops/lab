package middleware

import (
	"context"
	"net/http"

	"github.com/google/uuid"
)

// RequestIDKey is the context key for the request ID.
type contextKey string

// RequestIDKey is the context key used to store the request ID
const RequestIDKey contextKey = "requestID"

// RequestIDHeader is the HTTP header name for the request ID
const RequestIDHeader = "X-Request-ID"

// WithRequestID adds a unique request ID to each request
func WithRequestID() func(http.HandlerFunc) http.HandlerFunc {
	return func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			// Check if request already has an ID.
			requestID := r.Header.Get(RequestIDHeader)
			if requestID == "" {
				// Generate a new UUID
				requestID = uuid.New().String()
			}

			// Add to response header for client correlation
			w.Header().Set(RequestIDHeader, requestID)

			// Add to request context for internal use
			ctx := context.WithValue(r.Context(), RequestIDKey, requestID)
			r = r.WithContext(ctx)

			next(w, r)
		}
	}
}

// GetRequestID retrieves the request ID from the context
func GetRequestID(ctx context.Context) string {
	if requestID, ok := ctx.Value(RequestIDKey).(string); ok {
		return requestID
	}

	return ""
}
