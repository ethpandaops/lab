package experiments

import (
	"context"
	"fmt"

	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/cartographoor"
	"github.com/ethpandaops/lab/backend/pkg/server/internal/service/xatu_cbt"
	"github.com/ethpandaops/lab/backend/pkg/server/proto/config"
	xatu_cbt_proto "github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/types/known/structpb"
)

// ServiceName is the name of the experiments service
const ServiceName = "experiments"

// ExperimentsService manages experiment definitions and configurations
type ExperimentsService struct {
	config               *Config
	log                  *logrus.Entry
	xatuCBTService       *xatu_cbt.XatuCBT
	cartographoorService *cartographoor.Service
}

// NewExperimentsService creates a new experiments service
func NewExperimentsService(
	cfg *Config,
	log logrus.FieldLogger,
	xatuCBTService *xatu_cbt.XatuCBT,
	cartographoorService *cartographoor.Service,
) *ExperimentsService {
	return &ExperimentsService{
		config:               cfg,
		log:                  log.WithField("service", ServiceName),
		xatuCBTService:       xatuCBTService,
		cartographoorService: cartographoorService,
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
		exp := &(*s.config)[i]
		if exp.Enabled {
			enabledCount++

			s.log.WithFields(logrus.Fields{
				"id":     exp.ID,
				"config": exp.Config,
			}).Debug("Loaded experiment config")
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

// GetExperimentConfigByID returns the configuration for a specific experiment
func (s *ExperimentsService) GetExperimentConfigByID(id string) (*ExperimentConfig, error) {
	if s.config == nil {
		return nil, fmt.Errorf("no experiments configured")
	}

	for i := range *s.config {
		exp := &(*s.config)[i]
		if exp.ID == id {
			return exp, nil
		}
	}

	return nil, fmt.Errorf("experiment %s not found", id)
}

// GetAllExperimentsConfig returns ALL experiments configuration without data availbility by default
func (s *ExperimentsService) GetAllExperimentsConfig(ctx context.Context, includeDA bool) []*config.ExperimentConfig {
	if s.config == nil {
		s.log.Warn("GetAllExperimentsConfig called but config is nil")

		return nil
	}

	s.log.WithField("num_experiments", len(*s.config)).Debug("GetAllExperimentsConfig called")
	experiments := make([]*config.ExperimentConfig, 0, len(*s.config))

	for i := range *s.config {
		exp := &(*s.config)[i]

		if !exp.Enabled {
			continue
		}

		s.log.WithFields(logrus.Fields{
			"id":        exp.ID,
			"enabled":   exp.Enabled,
			"networks":  exp.Networks,
			"hasConfig": exp.Config != nil,
			"config":    exp.Config,
		}).Debug("Processing experiment for API response")

		expConfig := &config.ExperimentConfig{
			Id:       exp.ID,
			Enabled:  exp.Enabled,
			Networks: exp.Networks,
		}

		// Convert config map to protobuf Struct
		if exp.Config != nil {
			s.log.WithField("experiment", exp.ID).WithField("config", exp.Config).Info("Converting experiment config to protobuf struct")

			configStruct, err := structpb.NewStruct(exp.Config)
			if err != nil {
				s.log.WithError(err).WithField("experiment", exp.ID).Warn("Failed to convert config to struct")
			} else {
				expConfig.Config = configStruct
			}
		} else {
			s.log.WithField("experiment", exp.ID).Debug("No config found for experiment")
		}

		if includeDA {
			expConfig.DataAvailability = s.getDataAvailabilityForExperiment(ctx, exp)
		}

		experiments = append(experiments, expConfig)
	}

	return experiments
}

// GetExperimentConfig returns a single experiment's configuration with data availability.
func (s *ExperimentsService) GetExperimentConfig(ctx context.Context, experimentID string) (*config.ExperimentConfig, error) {
	if s.config == nil {
		return nil, fmt.Errorf("experiments service not configured")
	}

	// Find the experiment
	var experiment *ExperimentConfig

	for i := range *s.config {
		if (*s.config)[i].ID == experimentID {
			experiment = &(*s.config)[i]

			break
		}
	}

	if experiment == nil {
		return nil, fmt.Errorf("experiment not found: %s", experimentID)
	}

	if !experiment.Enabled {
		return nil, fmt.Errorf("experiment disabled: %s", experimentID)
	}

	// Get data availability for this experiment
	dataAvailability := s.getDataAvailabilityForExperiment(ctx, experiment)

	return &config.ExperimentConfig{
		Id:               experiment.ID,
		Enabled:          experiment.Enabled,
		Networks:         experiment.Networks,
		DataAvailability: dataAvailability,
	}, nil
}

// getDataAvailabilityForExperiment queries data availability for all networks of an experiment
func (s *ExperimentsService) getDataAvailabilityForExperiment(ctx context.Context, exp *ExperimentConfig) map[string]*config.ExperimentDataAvailability {
	if s.xatuCBTService == nil || s.cartographoorService == nil {
		return nil
	}

	dataAvailability := make(map[string]*config.ExperimentDataAvailability)
	tables := GetTablesForExperiment(exp.ID)

	if len(tables) == 0 {
		s.log.WithField("experiment_id", exp.ID).Debug("No tables defined for experiment")

		return dataAvailability
	}

	// First, validate which networks exist via cartographoor
	validNetworks := make([]string, 0, len(exp.Networks))
	for _, network := range exp.Networks {
		if s.cartographoorService.GetNetwork(network) != nil {
			validNetworks = append(validNetworks, network)
		} else {
			s.log.WithField("experiment_id", exp.ID).
				WithField("network", network).
				Warn("Network not found in cartographoor, skipping data availability query")
		}
	}

	if len(validNetworks) == 0 {
		s.log.WithField("experiment_id", exp.ID).
			Warn("No valid networks found for experiment")

		return dataAvailability
	}

	// Query data availability for valid networks only
	for _, network := range validNetworks {
		// Add network to context metadata - use incoming context for internal service calls
		md := metadata.New(map[string]string{"network": network})
		ctxWithNetwork := metadata.NewIncomingContext(ctx, md)

		// Query data availability
		req := &xatu_cbt_proto.GetDataAvailabilityRequest{
			Tables:        tables,
			PositionField: "slot_start_date_time",
		}

		resp, err := s.xatuCBTService.GetDataAvailability(ctxWithNetwork, req)
		if err != nil {
			s.log.WithError(err).
				WithField("experiment_id", exp.ID).
				WithField("network", network).
				Warn("Failed to get data availability for valid network")

			continue
		}

		// Convert to config proto format
		dataAvailability[network] = &config.ExperimentDataAvailability{
			MinSlot: resp.MinSlot,
			MaxSlot: resp.MaxSlot,
			HasData: resp.HasData,
		}
	}

	s.log.WithField("experiment_id", exp.ID).
		WithField("total_networks", len(exp.Networks)).
		WithField("valid_networks", len(validNetworks)).
		WithField("successful_queries", len(dataAvailability)).
		Debug("Completed data availability queries for experiment")

	return dataAvailability
}
