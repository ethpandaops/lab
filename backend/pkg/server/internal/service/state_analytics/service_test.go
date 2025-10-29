package state_analytics

import (
	"testing"

	"github.com/ethpandaops/lab/backend/pkg/internal/lab/clickhouse"
	"github.com/sirupsen/logrus"
)

// TestNew verifies that the service can be created with valid config
func TestNew(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel) // Reduce noise in tests

	tests := []struct {
		name      string
		config    *Config
		wantError bool
	}{
		{
			name: "valid config",
			config: &Config{
				NetworkConfigs: map[string]*NetworkConfig{
					"mainnet": {
						Enabled: true,
						ClickHouse: &clickhouse.Config{
							DSN: "clickhouse://localhost:9000/mainnet",
						},
					},
				},
			},
			wantError: false,
		},
		{
			name:      "nil config",
			config:    nil,
			wantError: true,
		},
		{
			name: "empty network configs",
			config: &Config{
				NetworkConfigs: map[string]*NetworkConfig{},
			},
			wantError: true,
		},
		{
			name: "enabled network without clickhouse config",
			config: &Config{
				NetworkConfigs: map[string]*NetworkConfig{
					"mainnet": {
						Enabled:    true,
						ClickHouse: nil,
					},
				},
			},
			wantError: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, err := New(log, tt.config, nil)

			if tt.wantError {
				if err == nil {
					t.Error("Expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected error: %v", err)
				}
				if svc == nil {
					t.Error("Expected service but got nil")
				}
				if svc != nil && svc.Name() != ServiceName {
					t.Errorf("Service name = %s, expected %s", svc.Name(), ServiceName)
				}
			}
		})
	}
}

// TestServiceName verifies the service name is correct
func TestServiceName(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	config := &Config{
		NetworkConfigs: map[string]*NetworkConfig{
			"mainnet": {
				Enabled: true,
				ClickHouse: &clickhouse.Config{
					DSN: "clickhouse://localhost:9000/mainnet",
				},
			},
		},
	}

	svc, err := New(log, config, nil)
	if err != nil {
		t.Fatalf("Failed to create service: %v", err)
	}

	if svc.Name() != "state_analytics" {
		t.Errorf("Name() = %s, expected state_analytics", svc.Name())
	}
}

// TestConfigValidation tests the config validation
func TestConfigValidation(t *testing.T) {
	tests := []struct {
		name      string
		config    *Config
		wantError bool
	}{
		{
			name:      "nil config",
			config:    nil,
			wantError: true,
		},
		{
			name: "empty network configs",
			config: &Config{
				NetworkConfigs: map[string]*NetworkConfig{},
			},
			wantError: true,
		},
		{
			name: "nil network config",
			config: &Config{
				NetworkConfigs: map[string]*NetworkConfig{
					"mainnet": nil,
				},
			},
			wantError: true,
		},
		{
			name: "enabled without clickhouse",
			config: &Config{
				NetworkConfigs: map[string]*NetworkConfig{
					"mainnet": {
						Enabled:    true,
						ClickHouse: nil,
					},
				},
			},
			wantError: true,
		},
		{
			name: "disabled without clickhouse (ok)",
			config: &Config{
				NetworkConfigs: map[string]*NetworkConfig{
					"mainnet": {
						Enabled:    false,
						ClickHouse: nil,
					},
				},
			},
			wantError: false,
		},
		{
			name: "valid single network",
			config: &Config{
				NetworkConfigs: map[string]*NetworkConfig{
					"mainnet": {
						Enabled: true,
						ClickHouse: &clickhouse.Config{
							DSN: "clickhouse://localhost:9000/mainnet",
						},
					},
				},
			},
			wantError: false,
		},
		{
			name: "valid multiple networks",
			config: &Config{
				NetworkConfigs: map[string]*NetworkConfig{
					"mainnet": {
						Enabled: true,
						ClickHouse: &clickhouse.Config{
							DSN: "clickhouse://localhost:9000/mainnet",
						},
					},
					"sepolia": {
						Enabled: true,
						ClickHouse: &clickhouse.Config{
							DSN: "clickhouse://localhost:9000/sepolia",
						},
					},
				},
			},
			wantError: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := tt.config.Validate()

			if tt.wantError {
				if err == nil {
					t.Error("Expected validation error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("Unexpected validation error: %v", err)
				}
			}
		})
	}
}

// TestRecordMetrics verifies metrics recording doesn't panic
func TestRecordMetrics(t *testing.T) {
	log := logrus.New()
	log.SetLevel(logrus.ErrorLevel)

	config := &Config{
		NetworkConfigs: map[string]*NetworkConfig{
			"mainnet": {
				Enabled: true,
				ClickHouse: &clickhouse.Config{
					DSN: "clickhouse://localhost:9000/mainnet",
				},
			},
		},
	}

	svc, err := New(log, config, nil)
	if err != nil {
		t.Fatalf("Failed to create service: %v", err)
	}

	// Should not panic even with nil metrics
	svc.recordMetrics("TestMethod", "mainnet", StatusSuccess, 0.123)
	svc.recordMetrics("TestMethod", "mainnet", StatusError, 0.456)
}
