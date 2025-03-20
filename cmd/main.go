package main

import (
	"fmt"
	"os"

	"github.com/ethpandaops/lab/pkg/api"
	"github.com/ethpandaops/lab/pkg/logger"
	"github.com/ethpandaops/lab/pkg/srv"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

var configPath string

// AppConfig contains the application configuration
type AppConfig struct {
	LogLevel string     `yaml:"log_level"`
	API      api.Config `yaml:"api"`
	SRV      srv.Config `yaml:"srv"`
}

func main() {
	// Create the root command
	rootCmd := &cobra.Command{
		Use:   "lab",
		Short: "EthPandaOps Lab - Ethereum metrics collection and analysis",
		Long:  `Lab is a tool for collecting and analyzing Ethereum metrics`,
	}

	// Add global flags
	rootCmd.PersistentFlags().StringVarP(&configPath, "config", "c", "config.yaml", "Path to the config file")

	// Add subcommands
	rootCmd.AddCommand(createSrvCommand())
	rootCmd.AddCommand(createAPICommand())

	// Execute the root command
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %s\n", err)
		os.Exit(1)
	}
}

// loadConfig loads and parses the configuration file
func loadConfig() (*AppConfig, error) {
	config := &AppConfig{
		LogLevel: "info", // Default log level
	}

	// Read config file
	configFile, err := os.ReadFile(configPath)
	if err != nil {
		return nil, fmt.Errorf("error reading config file: %w", err)
	}

	// Parse config file
	err = yaml.Unmarshal(configFile, config)
	if err != nil {
		return nil, fmt.Errorf("error parsing config file: %w", err)
	}

	return config, nil
}

func createSrvCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "srv",
		Short: "Run the srv service",
		Long:  `Start the srv service for business logic and data processing`,
		RunE: func(cmd *cobra.Command, args []string) error {
			// Load config
			cfg, err := loadConfig()
			if err != nil {
				return fmt.Errorf("failed to load config: %w", err)
			}

			// Create logger
			log, err := logger.New(cfg.LogLevel)
			if err != nil {
				return fmt.Errorf("failed to create logger: %w", err)
			}

			// Create and start the srv service
			service, err := srv.New(cfg.SRV, log)
			if err != nil {
				return fmt.Errorf("failed to create srv service: %w", err)
			}

			return service.Start()
		},
	}

	return cmd
}

func createAPICommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "api",
		Short: "Run the api service",
		Long:  `Start the api service for client-facing endpoints`,
		RunE: func(cmd *cobra.Command, args []string) error {
			// Load config
			cfg, err := loadConfig()
			if err != nil {
				return fmt.Errorf("failed to load config: %w", err)
			}

			// Create logger
			log, err := logger.New(cfg.LogLevel)
			if err != nil {
				return fmt.Errorf("failed to create logger: %w", err)
			}

			// Create and start the api service
			service, err := api.New(cfg.API, log)
			if err != nil {
				return fmt.Errorf("failed to create api service: %w", err)
			}

			return service.Start()
		},
	}

	return cmd
}
