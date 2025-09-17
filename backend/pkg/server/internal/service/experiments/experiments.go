package experiments

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/server/proto/config"
	"github.com/sirupsen/logrus"
)

// ServiceName is the name of the experiments service
const ServiceName = "experiments"

// ExperimentsService manages experiment definitions and configurations
type ExperimentsService struct {
	config *Config
	log    *logrus.Entry
}

// NewExperimentsService creates a new experiments service
func NewExperimentsService(cfg *Config, log logrus.FieldLogger) *ExperimentsService {
	return &ExperimentsService{
		config: cfg,
		log:    log.WithField("service", ServiceName),
	}
}

// Start starts the experiments service
func (s *ExperimentsService) Start(ctx context.Context) error {
	s.log.Info("Starting experiments service")

	// Validate configuration
	if err := s.config.Validate(); err != nil {
		return fmt.Errorf("invalid experiments configuration: %w", err)
	}

	enabledCount := 0

	for i := range *s.config {
		if (*s.config)[i].Enabled {
			enabledCount++
		}
	}

	s.log.WithFields(logrus.Fields{
		"total_experiments":   len(*s.config),
		"enabled_experiments": enabledCount,
	}).Info("Experiments service started successfully")

	return nil
}

// Stop stops the experiments service
func (s *ExperimentsService) Stop() error {
	s.log.Info("Stopping experiments service")

	return nil
}

// Name returns the name of the service
func (s *ExperimentsService) Name() string {
	return ServiceName
}

// FrontendExperimentsConfig returns the experiments configuration for the frontend
func (s *ExperimentsService) FrontendExperimentsConfig() *config.ExperimentsConfig {
	if s.config == nil {
		return nil
	}

	experiments := make([]*config.ExperimentConfig, 0, len(*s.config))

	for i := range *s.config {
		exp := &(*s.config)[i]

		if !exp.Enabled {
			continue
		}

		expConfig := &config.ExperimentConfig{
			Id:       exp.ID,
			Enabled:  exp.Enabled,
			Networks: exp.Networks,
		}

		experiments = append(experiments, expConfig)
	}

	return &config.ExperimentsConfig{
		Experiments: experiments,
	}
}

// GetExperiments returns all configured experiments
func (s *ExperimentsService) GetExperiments() []*ExperimentConfig {
	if s.config == nil {
		return nil
	}

	experiments := make([]*ExperimentConfig, 0, len(*s.config))

	for i := range *s.config {
		experiments = append(experiments, &(*s.config)[i])
	}

	return experiments
}

// GetExperimentByID returns a specific experiment by ID
func (s *ExperimentsService) GetExperimentByID(id string) (*ExperimentConfig, error) {
	if s.config == nil {
		return nil, fmt.Errorf("experiments service not configured")
	}

	for i := range *s.config {
		if (*s.config)[i].ID == id {
			return &(*s.config)[i], nil
		}
	}

	return nil, fmt.Errorf("experiment not found: %s", id)
}

// GetExperimentsByNetwork returns experiments that support a specific network
func (s *ExperimentsService) GetExperimentsByNetwork(network string) []*ExperimentConfig {
	if s.config == nil {
		return nil
	}

	experiments := make([]*ExperimentConfig, 0)

	for i := range *s.config {
		exp := &(*s.config)[i]

		for _, net := range exp.Networks {
			if net == network {
				experiments = append(experiments, exp)

				break
			}
		}
	}

	return experiments
}
