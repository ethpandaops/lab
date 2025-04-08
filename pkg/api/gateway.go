package api

import (
	"context"
	"fmt"
	"net"
	"net/http"

	apipb "github.com/ethpandaops/lab/pkg/api/proto"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// GatewayConfig contains configuration for the gRPC gateway
type GatewayConfig struct {
	GRPCPort int `yaml:"grpcPort"`
	RESTPort int `yaml:"restPort"`
}

// StartGateway starts the gRPC gateway service
func (s *Service) StartGateway(ctx context.Context) error {
	grpcPort := 9090
	restPort := 8080

	// Use Gateway config if available
	if s.config.Gateway != nil {
		if s.config.Gateway.GRPCPort > 0 {
			grpcPort = s.config.Gateway.GRPCPort
		}
		if s.config.Gateway.RESTPort > 0 {
			restPort = s.config.Gateway.RESTPort
		}
	}

	grpcServer := grpc.NewServer()

	// Register LabAPI gRPC service
	labAPIServer := NewLabAPIServer()
	apipb.RegisterLabAPIServer(grpcServer, labAPIServer)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", grpcPort))
	if err != nil {
		return err
	}

	// Save gRPC server for clean shutdown
	s.grpcServer = grpcServer
	s.grpcListener = lis

	go func() {
		s.lab.Log().WithField("port", grpcPort).Info("Starting gRPC server")
		if err := grpcServer.Serve(lis); err != nil && err != grpc.ErrServerStopped {
			s.lab.Log().WithError(err).Error("gRPC server error")
			s.cancel()
		}
	}()

	mux := runtime.NewServeMux()

	// Register gRPC-Gateway handlers
	err = apipb.RegisterLabAPIHandlerFromEndpoint(ctx, mux, fmt.Sprintf(":%d", grpcPort),
		[]grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())})
	if err != nil {
		return err
	}

	// Create HTTP server for REST API
	s.restServer = &http.Server{
		Addr:    fmt.Sprintf(":%d", restPort),
		Handler: addGatewayCacheControl(mux),
	}

	s.lab.Log().WithField("port", restPort).Info("Starting HTTP REST gateway")
	go func() {
		if err := s.restServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.lab.Log().WithError(err).Error("REST gateway error")
			s.cancel()
		}
	}()

	// Don't block here - let the service.Start method handle waiting for shutdown
	return nil
}

func addGatewayCacheControl(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Example cache-control header, adjust as needed
		w.Header().Set("Cache-Control", "public, max-age=60")
		h.ServeHTTP(w, r)
	})
}
