package beacon_chain_timings

import (
	"context"

	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/ethpandaops/lab/pkg/internal/lab/temporal"
	"github.com/ethpandaops/lab/pkg/internal/lab/xatu"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
)

// Service implements the Beacon Chain Timings gRPC service
type Service struct {
	UnimplementedBeaconChainTimingsServiceServer
	log            logrus.FieldLogger
	xatuClient     *xatu.Client
	storageClient  storage.Client
	temporalClient temporal.Client
}

// NewService creates a new Service implementation
func NewService(
	log logrus.FieldLogger,
	xatuClient *xatu.Client,
	storageClient storage.Client,
	temporalClient temporal.Client,
) *Service {
	return &Service{
		log:            log.WithField("component", "grpc/beacon_chain_timings"),
		xatuClient:     xatuClient,
		storageClient:  storageClient,
		temporalClient: temporalClient,
	}
}

// Name returns the name of the service
func (s *Service) Name() string {
	return "beacon_chain_timings"
}

func (s *Service) Start(ctx context.Context, grpcServer *grpc.Server) error {
	RegisterBeaconChainTimingsServiceServer(grpcServer, s)

	s.log.Info("BeaconChainTimings GRPC service started")

	return nil
}

// GetTimingData gets timing data for a specific network and time window
func (s *Service) GetTimingData(ctx context.Context, req *GetTimingDataRequest) (*GetTimingDataResponse, error) {
	s.log.WithFields(logrus.Fields{
		"network":    req.Network,
		"window":     req.WindowName,
		"start_time": req.StartTime,
		"end_time":   req.EndTime,
	}).Debug("GetTimingData request received")

	// TODO: Implement fetching data from storage
	return &GetTimingDataResponse{
		Data: []*TimingData{},
	}, nil
}

// GetSizeCDFData gets size CDF data for a specific network
func (s *Service) GetSizeCDFData(ctx context.Context, req *GetSizeCDFDataRequest) (*GetSizeCDFDataResponse, error) {
	s.log.WithFields(logrus.Fields{
		"network":    req.Network,
		"start_time": req.StartTime,
		"end_time":   req.EndTime,
	}).Debug("GetSizeCDFData request received")

	// TODO: Implement fetching data from storage
	return &GetSizeCDFDataResponse{
		Data: []*SizeCDFData{},
	}, nil
}
