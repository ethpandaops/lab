package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/sirupsen/logrus"
)

func main() {
	log := logrus.New()
	log.SetLevel(logrus.InfoLevel)
	log.Info("Starting api service")

	// Create a context that is canceled when SIGINT or SIGTERM is received
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Set up signal handling
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		log.WithField("signal", sig.String()).Info("Received signal, shutting down")
		cancel()
	}()

	// TODO: Initialize services
	// - Config
	// - gRPC client to srv service
	// - Cache
	// - NATS connection for events
	// - HTTP/REST server
	// - Websocket server

	// Block until context is canceled
	<-ctx.Done()
	log.Info("Context canceled, cleaning up...")

	// TODO: Clean up resources
	// - Close connections
	// - Shutdown HTTP server

	log.Info("Api service stopped")
}
