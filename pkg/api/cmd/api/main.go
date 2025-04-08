package main

import (
	"context"
	"log"
	"net"
	"net/http"

	"github.com/grpc-ecosystem/grpc-gateway/v2/runtime"
	"google.golang.org/grpc"
)

func main() {
	ctx := context.Background()
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()

	grpcServer := grpc.NewServer()

	// TODO: Register LabAPI gRPC service here
	// pb.RegisterLabAPIServer(grpcServer, &labAPIServer{})

	lis, err := net.Listen("tcp", ":9090")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	go func() {
		log.Println("Starting gRPC server on :9090")
		if err := grpcServer.Serve(lis); err != nil {
			log.Fatalf("failed to serve gRPC: %v", err)
		}
	}()

	mux := runtime.NewServeMux()

	// TODO: Register gRPC-Gateway handlers here
	// err = pb.RegisterLabAPIHandlerFromEndpoint(ctx, mux, ":9090", []grpc.DialOption{grpc.WithInsecure()})
	// if err != nil {
	// 	log.Fatalf("failed to register gateway: %v", err)
	// }

	log.Println("Starting HTTP REST gateway on :8080")
	if err := http.ListenAndServe(":8080", addCacheControl(mux)); err != nil {
		log.Fatalf("failed to serve HTTP: %v", err)
	}
}

func addCacheControl(h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Example cache-control header, adjust as needed
		w.Header().Set("Cache-Control", "public, max-age=60")
		h.ServeHTTP(w, r)
	})
}
