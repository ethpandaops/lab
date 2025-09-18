package rest

import (
	"context"
	"encoding/json"
	"net/http"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	"github.com/ethpandaops/lab/backend/pkg/api/v1/rest/middleware"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

// contextKey is a type for context keys to avoid collisions
type contextKey string

const errorHandlerKey contextKey = "error_handler"

// ErrorHandler provides structured error handling for REST endpoints
type ErrorHandler struct {
	log logrus.FieldLogger
}

// NewErrorHandler creates a new error handler
func NewErrorHandler(log logrus.FieldLogger) *ErrorHandler {
	return &ErrorHandler{log: log}
}

// HandleGRPCError converts gRPC errors to appropriate HTTP responses
func (h *ErrorHandler) HandleGRPCError(w http.ResponseWriter, r *http.Request, err error) {
	// Extract gRPC status
	st, ok := status.FromError(err)
	if !ok {
		// Not a gRPC error, treat as internal error
		h.WriteError(w, r, http.StatusInternalServerError, "Internal server error")

		return
	}

	// Map gRPC codes to HTTP status codes
	var httpStatus int

	switch st.Code() {
	case codes.OK:
		// This shouldn't happen, but just in case
		return
	case codes.Canceled:
		httpStatus = http.StatusRequestTimeout
	case codes.Unknown:
		httpStatus = http.StatusInternalServerError
	case codes.InvalidArgument:
		httpStatus = http.StatusBadRequest
	case codes.DeadlineExceeded:
		httpStatus = http.StatusRequestTimeout
	case codes.NotFound:
		httpStatus = http.StatusNotFound
	case codes.AlreadyExists:
		httpStatus = http.StatusConflict
	case codes.PermissionDenied:
		httpStatus = http.StatusForbidden
	case codes.ResourceExhausted:
		httpStatus = http.StatusTooManyRequests
	case codes.FailedPrecondition:
		httpStatus = http.StatusPreconditionFailed
	case codes.Aborted:
		httpStatus = http.StatusConflict
	case codes.OutOfRange:
		httpStatus = http.StatusBadRequest
	case codes.Unimplemented:
		httpStatus = http.StatusNotImplemented
	case codes.Internal:
		httpStatus = http.StatusInternalServerError
	case codes.Unavailable:
		httpStatus = http.StatusServiceUnavailable
	case codes.DataLoss:
		httpStatus = http.StatusInternalServerError
	case codes.Unauthenticated:
		httpStatus = http.StatusUnauthorized
	default:
		httpStatus = http.StatusInternalServerError
	}

	// Use the gRPC error message if available
	message := st.Message()
	if message == "" {
		message = http.StatusText(httpStatus)
	}

	h.WriteError(w, r, httpStatus, message)
}

// WriteError writes a structured error response
func (h *ErrorHandler) WriteError(w http.ResponseWriter, r *http.Request, statusCode int, message string) {
	// Get request ID from context for correlation
	requestID := middleware.GetRequestID(r.Context())

	// Log the error with context
	h.log.WithFields(logrus.Fields{
		"status":     statusCode,
		"message":    message,
		"path":       r.URL.Path,
		"method":     r.Method,
		"request_id": requestID,
	}).Error("API error response")

	// Set headers
	w.Header().Set("Content-Type", "application/json")

	if requestID != "" {
		w.Header().Set(middleware.RequestIDHeader, requestID)
	}

	// Write status code
	w.WriteHeader(statusCode)

	// Build error response
	response := &apiv1.ErrorResponse{
		Error:     http.StatusText(statusCode),
		Message:   message,
		Code:      int32(statusCode), //nolint:gosec // http constant.
		RequestId: requestID,
	}

	// Encode response
	if err := json.NewEncoder(w).Encode(response); err != nil {
		h.log.WithError(err).Error("Failed to encode error response")
	}
}

// WrapContext adds error handling context to the request
func WrapContext(ctx context.Context, log logrus.FieldLogger) context.Context {
	return context.WithValue(ctx, errorHandlerKey, NewErrorHandler(log))
}

// GetErrorHandler retrieves the error handler from context
func GetErrorHandler(ctx context.Context) *ErrorHandler {
	if handler, ok := ctx.Value(errorHandlerKey).(*ErrorHandler); ok {
		return handler
	}
	// Return a default handler if none in context
	return NewErrorHandler(logrus.StandardLogger())
}
