package discovery

import (
	"fmt"
	"os"
	"strconv"

	"github.com/ethpandaops/lab/pkg/logger"
)

// Client handles service-to-service communication
type Client struct {
	log *logger.Logger
}

// New creates a new Discovery instance
func New(log *logger.Logger) (*Client, error) {
	if log == nil {
		return nil, fmt.Errorf("logger cannot be nil")
	}

	return &Client{
		log: log,
	}, nil
}

// GetSRVGRPCAddress returns the gRPC address for the SRV service
func (c *Client) GetSRVGRPCAddress() (string, int, error) {
	host := os.Getenv("LAB_SRV_GRPC_HOST")
	if host == "" {
		host = "localhost" // Default host
	}

	portStr := os.Getenv("LAB_SRV_GRPC_PORT")
	if portStr == "" {
		portStr = "50051" // Default port
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return "", 0, fmt.Errorf("failed to parse SRV gRPC port: %w", err)
	}

	c.log.WithField("host", host).WithField("port", port).Debug("Discovered SRV gRPC address")

	return host, port, nil
}

// GetSRVGRPCAddressString returns the gRPC address for the SRV service as a string
func (c *Client) GetSRVGRPCAddressString() (string, error) {
	host, port, err := c.GetSRVGRPCAddress()
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s:%d", host, port), nil
}

// GetAPIRESTAddress returns the REST API address for the API service
func (c *Client) GetAPIRESTAddress() (string, int, error) {
	host := os.Getenv("LAB_API_REST_HOST")
	if host == "" {
		host = "localhost" // Default host
	}

	portStr := os.Getenv("LAB_API_REST_PORT")
	if portStr == "" {
		portStr = "8080" // Default port
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		return "", 0, fmt.Errorf("failed to parse API REST port: %w", err)
	}

	c.log.WithField("host", host).WithField("port", port).Debug("Discovered API REST address")

	return host, port, nil
}

// GetAPIRESTAddressString returns the REST API address for the API service as a string
func (c *Client) GetAPIRESTAddressString() (string, error) {
	host, port, err := c.GetAPIRESTAddress()
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s:%d", host, port), nil
}
