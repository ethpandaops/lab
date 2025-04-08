package grpc

import (
	"context"
	"time"

	"errors" // Needed for error checking

	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	xpc "github.com/ethpandaops/lab/pkg/server/internal/service/xatu_public_contributors"

	pb "github.com/ethpandaops/lab/pkg/server/proto/xatu_public_contributors"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"
)

// Service implements the Xatu Public Contributors gRPC service
type XatuPublicContributors struct {
	pb.UnimplementedXatuPublicContributorsServiceServer
	log     logrus.FieldLogger
	service *xpc.XatuPublicContributors
}

// NewXatuPublicContributors creates a new XatuPublicContributors implementation
func NewXatuPublicContributors(
	log logrus.FieldLogger,
	svc *xpc.XatuPublicContributors,
) *XatuPublicContributors {
	return &XatuPublicContributors{
		log:     log.WithField("component", "grpc/xatu_public_contributors"),
		service: svc,
	}
}

// Name returns the name of the service
func (x *XatuPublicContributors) Name() string {
	return "xatu_public_contributors"
}

func (x *XatuPublicContributors) Start(ctx context.Context, grpcServer *grpc.Server) error {
	pb.RegisterXatuPublicContributorsServiceServer(grpcServer, x)

	x.log.Info("XatuPublicContributors GRPC service started")

	return nil
}

// toGRPCError converts a standard Go error into a gRPC status error.
// It maps common error types to appropriate gRPC codes.
func toGRPCError(log logrus.FieldLogger, err error) error {
	if err == nil {
		return nil
	}

	// Map specific known errors
	if errors.Is(err, storage.ErrNotFound) {
		log.WithError(err).Warn("Resource not found")
		// Return NotFound code, but potentially a user-friendly message
		return status.Error(codes.NotFound, "requested data not found")
	}
	// TODO: Add mapping for validation errors if the service layer implements them
	// if errors.Is(err, xpc.ErrInvalidArgument) { // Example
	// 	log.WithError(err).Warn("Invalid argument")
	// 	return status.Error(codes.InvalidArgument, err.Error())
	// }

	log.WithError(err).Error("Internal server error occurred")
	// Default to Internal error for unhandled cases
	return status.Error(codes.Internal, "internal server error") // Avoid leaking internal details
}

// GetSummary gets summary data for networks
func (x *XatuPublicContributors) GetSummary(ctx context.Context, req *pb.GetSummaryRequest) (*pb.GetSummaryResponse, error) {
	log := x.log.WithFields(logrus.Fields{
		// Note: The request has a network field, but the underlying data is global.
		// We ignore req.Network for now as ReadSummaryData reads the global file.
		// If network-specific summaries were needed, the service/storage layer would need changes.
		"method": "GetSummary",
	})
	log.Debug("Request received")

	// Read the pre-processed global summary data from storage via the service method
	summaryData, err := x.service.ReadSummaryData(ctx)
	if err != nil {
		// Handle ErrNotFound specifically
		if errors.Is(err, storage.ErrNotFound) {
			log.Warn("Global summary data not found, returning empty response")
			// Return an empty summary as per proto definition
			return &pb.GetSummaryResponse{Summary: &pb.SummaryData{}}, nil
		}
		return nil, toGRPCError(log, err) // Handle other errors
	}
	if summaryData == nil {
		log.Warn("Service returned nil summary without error, returning empty response")
		return &pb.GetSummaryResponse{Summary: &pb.SummaryData{}}, nil
	}

	// Map the service.GlobalSummary struct to pb.SummaryData
	pbSummary := &pb.SummaryData{
		Networks:       make([]*pb.NetworkStats, 0, len(summaryData.Networks)),
		TotalNodes:     int32(summaryData.Totals.Nodes.Public), // Use public count from totals
		TotalCountries: int32(len(summaryData.Totals.Countries)),
	}

	for netName, netAgg := range summaryData.Networks {
		networkStats := &pb.NetworkStats{
			Network:        netName,
			NodeCounts:     make([]*pb.NodeCount, 0, len(netAgg.Countries)),
			TotalNodes:     int32(netAgg.Nodes.Public), // Use public count for the network
			TotalCountries: int32(len(netAgg.Countries)),
		}
		for countryCode, countryCount := range netAgg.Countries {
			networkStats.NodeCounts = append(networkStats.NodeCounts, &pb.NodeCount{
				Country: countryCode,
				Count:   int32(countryCount.Public), // Use public count per country
			})
		}
		pbSummary.Networks = append(pbSummary.Networks, networkStats)
	}

	return &pb.GetSummaryResponse{
		Summary: pbSummary,
	}, nil
}

// GetCountriesData gets countries data for a specific network and time window
func (x *XatuPublicContributors) GetCountryData(ctx context.Context, req *pb.GetCountryDataRequest) (*pb.GetCountryDataResponse, error) {
	log := x.log.WithFields(logrus.Fields{
		"network": req.Network,
		"method":  "GetCountryData",
	})
	log.Debug("Request received")

	// Determine which window file to read. Defaulting to "24h" for now.
	// TODO: Consider making the window configurable via the request if needed.
	windowFile := "24h"

	// Read the pre-processed country time series data from storage
	serviceDataPoints, err := x.service.ReadCountryDataWindow(ctx, req.Network, windowFile)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			log.Warnf("Country data not found for network %s, window %s", req.Network, windowFile)
			return &pb.GetCountryDataResponse{DataPoints: []*pb.CountryDataPoint{}}, nil // Return empty list
		}
		return nil, toGRPCError(log, err)
	}

	// Map the service []*xpc.CountryTimePoint to pb []*pb.CountryDataPoint
	pbDataPoints := make([]*pb.CountryDataPoint, 0, len(serviceDataPoints))
	for _, dp := range serviceDataPoints {
		if dp == nil {
			log.Warn("Service returned a nil CountryTimePoint in the list")
			continue
		}

		pbPoint := &pb.CountryDataPoint{
			Timestamp:  timestamppb.New(time.Unix(dp.Time, 0)), // Convert int64 timestamp
			NodeCounts: make([]*pb.NodeCount, 0, len(dp.Countries)),
			// TotalNodes and TotalCountries calculated below
		}

		var totalNodes int32 = 0
		var totalCountries int32 = 0
		for countryCode, count := range dp.Countries {
			if count > 0 { // Only include countries with nodes
				pbPoint.NodeCounts = append(pbPoint.NodeCounts, &pb.NodeCount{
					Country: countryCode,
					Count:   count,
				})
				totalNodes += count
				totalCountries++
			}
		}
		pbPoint.TotalNodes = totalNodes
		pbPoint.TotalCountries = totalCountries

		pbDataPoints = append(pbDataPoints, pbPoint)
	}

	return &pb.GetCountryDataResponse{
		DataPoints: pbDataPoints,
	}, nil
}

// GetUsersData gets users data for a specific network and time window
func (x *XatuPublicContributors) GetUsersData(ctx context.Context, req *pb.GetUsersDataRequest) (*pb.GetUsersDataResponse, error) {
	log := x.log.WithFields(logrus.Fields{
		"network": req.Network,
		"window":  req.Window,
		"method":  "GetUsersData",
	})
	log.Debug("Request received")

	// Validate window input? For now, assume it's valid (e.g., "1h", "24h")
	if req.Window == "" {
		log.Warn("Window parameter is missing")
		return nil, status.Error(codes.InvalidArgument, "window parameter is required")
	}

	// Read the pre-processed users time series data from storage
	// The service method already returns the correct proto type []*pb.UsersTimePoint
	dataPoints, err := x.service.ReadUsersDataWindow(ctx, req.Network, req.Window)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			log.Warnf("Users data not found for network %s, window %s", req.Network, req.Window)
			return &pb.GetUsersDataResponse{DataPoints: []*pb.UsersTimePoint{}}, nil // Return empty list
		}
		return nil, toGRPCError(log, err)
	}

	// Data is already in the correct format
	return &pb.GetUsersDataResponse{
		DataPoints: dataPoints,
	}, nil
}

// GetUserSummary gets user summary data for a specific user
func (x *XatuPublicContributors) GetUserSummary(ctx context.Context, req *pb.GetUserSummaryRequest) (*pb.GetUserSummaryResponse, error) {
	log := x.log.WithFields(logrus.Fields{
		"user":   req.Username,
		"method": "GetUserSummary",
	})
	log.Debug("Request received")

	if req.Username == "" {
		log.Warn("Username parameter is missing")
		return nil, status.Error(codes.InvalidArgument, "username parameter is required")
	}

	// Read the pre-processed user summary data from storage
	// The service method already returns the correct proto type *pb.UserSummary
	userSummary, err := x.service.ReadUserSummary(ctx, req.Username)
	if err != nil {
		if errors.Is(err, storage.ErrNotFound) {
			log.Warnf("User summary not found for user %s", req.Username)
			// Return NotFound as per gRPC best practices for a missing resource
			return nil, status.Error(codes.NotFound, "user summary not found")
		}
		return nil, toGRPCError(log, err)
	}
	if userSummary == nil {
		// Should be handled by ErrNotFound check above, but as a safeguard:
		log.Warn("Service returned nil user summary without error")
		return nil, status.Error(codes.NotFound, "user summary not found")
	}

	// Data is already in the correct format
	return &pb.GetUserSummaryResponse{
		UserSummary: userSummary,
	}, nil
}
