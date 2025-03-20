package lab

import (
	"context"
	"errors"
	"fmt"

	"github.com/ethpandaops/lab/pkg/internal/lab/broker"
	"github.com/ethpandaops/lab/pkg/internal/lab/discovery"
	"github.com/ethpandaops/lab/pkg/internal/lab/temporal"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatuclickhouse"
	"github.com/ethpandaops/lab/pkg/logger"
)

// Lab represents the central entity managing shared functionality
type Lab struct {
	serviceName string
	log         *logger.Logger
	ctx         context.Context
}

// New creates a new Lab instance
func New(ctx context.Context, serviceName string) (*Lab, error) {
	if serviceName == "" {
		return nil, errors.New("service name cannot be empty")
	}

	if ctx == nil {
		return nil, errors.New("context cannot be nil")
	}

	// Create logger with default level - can be updated later
	log, err := logger.New("info")
	if err != nil {
		return nil, fmt.Errorf("failed to create logger: %w", err)
	}

	lab := &Lab{
		serviceName: serviceName,
		log:         log,
		ctx:         ctx,
	}

	return lab, nil
}

// WithLogLevel sets the log level and returns the lab instance
func (l *Lab) WithLogLevel(level string) (*Lab, error) {
	newLog, err := logger.New(level)
	if err != nil {
		return l, fmt.Errorf("failed to update logger: %w", err)
	}
	l.log = newLog
	return l, nil
}

// Context returns the lab's context
func (l *Lab) Context() context.Context {
	return l.ctx
}

// Logger returns the lab's logger
func (l *Lab) Logger() *logger.Logger {
	return l.log
}

// ServiceName returns the service name
func (l *Lab) ServiceName() string {
	return l.serviceName
}

// NewBroker creates a new broker client
func (l *Lab) NewBroker(url string, subject string) (*broker.Client, error) {
	return broker.New(l.ctx, url, subject, l.log)
}

// NewXatuClickhouse creates a new XatuClickhouse client
func (l *Lab) NewXatuClickhouse(
	host string,
	port int,
	database string,
	username string,
	password string,
	secure bool,
) (*xatuclickhouse.Client, error) {
	return xatuclickhouse.New(
		l.ctx,
		host,
		port,
		database,
		username,
		password,
		secure,
		l.log,
	)
}

// NewTemporal creates a new Temporal client
func (l *Lab) NewTemporal(address string, namespace string, taskQueue string) (*temporal.Client, error) {
	return temporal.New(l.ctx, address, namespace, taskQueue, l.log)
}

// NewDiscovery creates a new service discovery client
func (l *Lab) NewDiscovery() (*discovery.Client, error) {
	return discovery.New(l.log)
}
