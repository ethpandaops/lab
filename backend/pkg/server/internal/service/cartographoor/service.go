package cartographoor

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/ethpandaops/lab/backend/pkg/server/proto/networks"
	"github.com/sirupsen/logrus"
	"google.golang.org/protobuf/encoding/protojson"
)

const (
	// NetworkStatusActive represents an active network.
	NetworkStatusActive = "active"
)

// Service provides cartographoor network data functionality.
type Service struct {
	log           logrus.FieldLogger
	config        *Config
	httpClient    *http.Client
	refreshTicker *time.Ticker
	stopChan      chan struct{}
	dataMu        sync.RWMutex
	networksData  *networks.NetworksData
}

// New creates a new cartographoor service.
func New(log logrus.FieldLogger, config *Config) (*Service, error) {
	if config == nil {
		config = &Config{}
	}

	if err := config.Validate(); err != nil {
		return nil, fmt.Errorf("invalid config: %w", err)
	}

	return &Service{
		log:        log.WithField("service", "cartographoor"),
		config:     config,
		httpClient: config.HTTPClient(),
		stopChan:   make(chan struct{}),
	}, nil
}

// Start starts the cartographoor service.
func (s *Service) Start(ctx context.Context) error {
	s.log.Info("Starting cartographoor service")

	// Initial data fetch.
	if err := s.fetchAndUpdateData(ctx); err != nil {
		s.log.WithError(err).Error("Failed to fetch initial cartographoor data")
	}

	// Start refresh ticker.
	s.refreshTicker = time.NewTicker(s.config.RefreshInterval)

	// Start background refresh goroutine.
	go s.refreshLoop(ctx)

	s.log.Info("Cartographoor service started successfully")

	return nil
}

// Stop stops the cartographoor service.
func (s *Service) Stop() {
	s.log.Info("Stopping cartographoor service")

	// Signal stop.
	close(s.stopChan)

	// Stop ticker.
	if s.refreshTicker != nil {
		s.refreshTicker.Stop()
	}

	s.log.Info("Cartographoor service stopped")
}

// Name returns the service name.
func (s *Service) Name() string {
	return "cartographoor"
}

// GetActiveNetworks returns a list of active network names.
func (s *Service) GetActiveNetworks() []string {
	s.dataMu.RLock()
	defer s.dataMu.RUnlock()

	if s.networksData == nil || s.networksData.Networks == nil {
		return []string{}
	}

	var activeNetworks []string

	for name, network := range s.networksData.Networks {
		if network.Status == NetworkStatusActive {
			activeNetworks = append(activeNetworks, name)
		}
	}

	sort.Strings(activeNetworks)

	return activeNetworks
}

// GetAllNetworks returns all network names.
func (s *Service) GetAllNetworks() []string {
	s.dataMu.RLock()
	defer s.dataMu.RUnlock()

	if s.networksData == nil || s.networksData.Networks == nil {
		return []string{}
	}

	networkNames := make([]string, 0, len(s.networksData.Networks))
	for name := range s.networksData.Networks {
		networkNames = append(networkNames, name)
	}

	sort.Strings(networkNames)

	return networkNames
}

// GetNetwork returns network information for a specific network.
func (s *Service) GetNetwork(networkName string) *networks.Network {
	s.dataMu.RLock()
	defer s.dataMu.RUnlock()

	if s.networksData == nil || s.networksData.Networks == nil {
		return nil
	}

	// Try exact match first.
	if network, exists := s.networksData.Networks[networkName]; exists {
		return network
	}

	// Try case-insensitive match.
	for name, network := range s.networksData.Networks {
		if strings.EqualFold(name, networkName) {
			return network
		}
	}

	return nil
}

// GetNetworkStatus returns the status of a specific network.
func (s *Service) GetNetworkStatus(networkName string) string {
	network := s.GetNetwork(networkName)
	if network == nil {
		return ""
	}

	return network.Status
}

// IsActiveNetwork checks if a network is active.
func (s *Service) IsActiveNetwork(networkName string) bool {
	status := s.GetNetworkStatus(networkName)

	return status == NetworkStatusActive
}

// fetchAndUpdateData fetches the latest network data from cartographoor.
func (s *Service) fetchAndUpdateData(ctx context.Context) error {
	s.log.Debug("Fetching cartographoor data")

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, s.config.SourceURL, http.NoBody)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("fetch data: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("read response: %w", err)
	}

	// Parse JSON into CartographoorResponse proto
	var rawResponse networks.CartographoorResponse

	unmarshaler := protojson.UnmarshalOptions{
		DiscardUnknown: true,
	}
	if err := unmarshaler.Unmarshal(body, &rawResponse); err != nil {
		return fmt.Errorf("parse JSON: %w", err)
	}

	// Convert to our NetworksData structure
	data := networks.NetworksData{
		Generated: rawResponse.Generated,
		Networks:  make(map[string]*networks.Network),
	}

	// Process each network, using the map key as the full network name
	for fullName, rawNet := range rawResponse.Networks {
		data.Networks[fullName] = &networks.Network{
			Name:          fullName, // Use the full prefixed name from the map key
			Status:        rawNet.Status,
			ChainId:       rawNet.ChainId,
			LastUpdated:   rawNet.LastUpdated,
			Description:   rawNet.Description,
			GenesisConfig: rawNet.GenesisConfig,
			ServiceUrls:   rawNet.ServiceUrls,
			SelfHostedDns: rawNet.SelfHostedDns,
			Forks:         rawNet.Forks,
		}
	}

	// Update the data
	s.dataMu.Lock()
	s.networksData = &data
	s.dataMu.Unlock()

	var (
		networkCount = len(data.Networks)
		activeCount  = 0
	)

	for _, network := range data.Networks {
		if network.Status == NetworkStatusActive {
			activeCount++
		}
	}

	s.log.WithFields(logrus.Fields{
		"total_networks":  networkCount,
		"active_networks": activeCount,
		"generated":       data.Generated,
	}).Info("Updated cartographoor data")

	return nil
}

// refreshLoop runs the background refresh loop.
func (s *Service) refreshLoop(ctx context.Context) {
	for {
		select {
		case <-s.refreshTicker.C:
			if err := s.fetchAndUpdateData(ctx); err != nil {
				s.log.WithError(err).Error("Failed to refresh cartographoor data")
			}
		case <-s.stopChan:
			return
		case <-ctx.Done():
			return
		}
	}
}

// GetNetworksData returns the raw networks data.
func (s *Service) GetNetworksData() *networks.NetworksData {
	s.dataMu.RLock()
	defer s.dataMu.RUnlock()

	return s.networksData
}

// ValidateNetwork validates a network name against cartographoor data.
func (s *Service) ValidateNetwork(ctx context.Context, networkName string) (*networks.Network, error) {
	if networkName == "" {
		return nil, fmt.Errorf("network name cannot be empty")
	}

	// Check if network exists.
	networkInfo := s.GetNetwork(networkName)
	if networkInfo == nil {
		return nil, fmt.Errorf("network '%s' not found", networkName)
	}

	// Check if network is active.
	isActive := s.IsActiveNetwork(networkName)
	if !isActive && networkInfo.Status != "active" {
		return nil, fmt.Errorf("network '%s' is not active (status: %s)", networkName, networkInfo.Status)
	}

	return networkInfo, nil
}
