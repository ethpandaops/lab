package srv

import (
	"context"
	"fmt"
	"net"

	"github.com/ethpandaops/lab/pkg/internal/lab"
	"github.com/ethpandaops/lab/pkg/srv/proto"
	"github.com/sirupsen/logrus"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

// GRPCServerConfig contains the configuration for the gRPC server
type GRPCServerConfig struct {
	Host string `yaml:"host"`
	Port int    `yaml:"port"`
}

// Server represents the gRPC server
type GRPCServer struct {
	log        *logrus.Entry
	lab        *lab.Lab
	config     *GRPCServerConfig
	grpcServer *grpc.Server
	services   map[string]proto.Service
}

// NewGRPCServer creates a new gRPC server
func NewGRPCServer(
	log *logrus.Entry,
	config *GRPCServerConfig,
) *GRPCServer {
	return &GRPCServer{
		log:      log.WithField("component", "grpc_server"),
		config:   config,
		services: make(map[string]proto.Service),
	}
}

// Start starts the gRPC server
func (s *GRPCServer) Start(ctx context.Context, address string, services []proto.Service) error {
	s.log.Info("Starting gRPC server")

	// Create gRPC server
	s.grpcServer = grpc.NewServer()

	for _, service := range services {
		if err := service.Start(ctx, s.grpcServer); err != nil {
			return fmt.Errorf("failed to start service: %w", err)
		}

		s.AddService(service.Name(), service)
	}

	// Enable server reflection for tools like grpcurl
	reflection.Register(s.grpcServer)

	// Create listener
	lis, err := net.Listen("tcp", address)
	if err != nil {
		return fmt.Errorf("failed to listen on %s: %w", address, err)
	}

	s.log.WithField("address", address).Info("gRPC server listening")

	// Start serving in a goroutine
	go func() {
		if err := s.grpcServer.Serve(lis); err != nil {
			s.log.WithError(err).Error("gRPC server failed to serve")
		}
	}()

	// Wait for context to be done
	<-ctx.Done()
	s.Stop()

	return nil
}

// Stop stops the gRPC server
func (s *GRPCServer) Stop() {
	if s.grpcServer != nil {
		s.log.Info("Stopping gRPC server")
		s.grpcServer.GracefulStop()
	}
}

// AddService adds a new service to the gRPC server
func (s *GRPCServer) AddService(name string, service proto.Service) {
	s.services[name] = service
}

// GetService gets a service from the gRPC server
func (s *GRPCServer) GetService(name string) proto.Service {
	return s.services[name]
}
