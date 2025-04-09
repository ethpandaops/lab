package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"github.com/ethpandaops/lab/pkg/api"
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

	// Example static service map
	serviceMap := map[string]string{
		"srv": "localhost:9090",
	}

	// Example config with empty/default values
	cfg := &api.Config{
		SrvClient: &api.SrvClientConfig{},
	}

	// Create API service with discovery
	apiService, err := api.New(cfg, "info", serviceMap)
	if err != nil {
		log.Fatalf("Failed to create API service: %v", err)
	}

	// Start API service
	if err := apiService.Start(ctx); err != nil {
		log.Fatalf("Failed to start API service: %v", err)
	}

	// Block until context is canceled
	<-ctx.Done()
	log.Info("Context canceled, cleaning up...")

	log.Info("Api service stopped")
}
