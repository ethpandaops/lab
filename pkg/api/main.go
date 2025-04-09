package api

import (
	"context"
	"fmt"
	"log"
	"net"
	"net/http"

	apipb "github.com/ethpandaops/lab/pkg/api/proto"
	"github.com/ethpandaops/lab/pkg/internal/lab"
	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// StartGateway starts the gRPC gateway service
func StartGateway(ctx context.Context) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	grpcServer := grpc.NewServer()

	// Initialize lab instance and dependencies
	labInst, err := lab.New(lab.Config{
		LogLevel: "info",
	}, "lab.ethpandaops.io.gateway")
	if err != nil {
		return fmt.Errorf("failed to create lab instance: %w", err)
	}

	cacheClient, err := labInst.NewCache(nil)
	if err != nil {
		return fmt.Errorf("failed to create cache client: %w", err)
	}

	storageClient, err := labInst.NewStorage(nil)
	if err != nil {
		return fmt.Errorf("failed to create storage client: %w", err)
	}

	labAPIServer := NewLabAPIServer(cacheClient, storageClient)
	apipb.RegisterLabAPIServer(grpcServer, labAPIServer)

	lis, err := net.Listen("tcp", ":9090")
	if err != nil {
		return err
	}

	go func() {
		log.Println("Starting gRPC server on :9090")
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("failed to serve gRPC: %v", err)
		}
	}()

	mux := runtime.NewServeMux()

	// Register gRPC-Gateway handlers
	err = apipb.RegisterLabAPIHandlerFromEndpoint(ctx, mux, ":9090", []grpc.DialOption{grpc.WithTransportCredentials(insecure.NewCredentials())})
	if err != nil {
		return err
	}

	log.Println("Starting HTTP REST gateway on :8080")
	return http.ListenAndServe(":8080", addCacheControl(mux))
}

func addCacheControl(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Example cache-control header, adjust as needed
		w.Header().Set("Cache-Control", "public, max-age=60")
		h.ServeHTTP(w, r)
	})
}
