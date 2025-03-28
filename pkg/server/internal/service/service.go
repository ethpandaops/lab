package service

import "context"

// Service is a generic service interface
// These services hold core business logic.
type Service interface {
	Start(ctx context.Context) error
	Name() string
}
