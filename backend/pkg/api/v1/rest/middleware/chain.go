package middleware

import (
	"net/http"

	"github.com/sirupsen/logrus"
)

// Chain represents a middleware chain.
type Chain struct {
	middlewares []func(http.HandlerFunc) http.HandlerFunc
}

// NewChain creates a new middleware chain.
func NewChain(middlewares ...func(http.HandlerFunc) http.HandlerFunc) Chain {
	return Chain{middlewares: middlewares}
}

// Then wraps the handler with all middlewares in the chain
func (c Chain) Then(handler http.HandlerFunc) http.HandlerFunc {
	// Apply middlewares in reverse order (last middleware is applied first)
	// This ensures the first middleware in the chain executes first.
	for i := len(c.middlewares) - 1; i >= 0; i-- {
		handler = c.middlewares[i](handler)
	}

	return handler
}

// DefaultChain creates the standard middleware chain for API routes (excluding caching)
// Note: Caching is applied separately since it needs the cache config.
// Order matters!
func DefaultChain(log logrus.FieldLogger, path string) Chain {
	return NewChain(
		WithRequestID(),
		WithRecovery(log),
		WithLogging(log),
		WithMetrics(path),
	)
}
