package main

import (
	"fmt"
	"os"

	"github.com/ethpandaops/lab/backend/pkg/api"
	srv "github.com/ethpandaops/lab/backend/pkg/server"
	"github.com/spf13/cobra"
	"gopkg.in/yaml.v3"
)

var (
	apiConfigPath string
	srvConfigPath string
	logLevel      string
)

func main() {
	// Create the root command
	rootCmd := &cobra.Command{
		Use:   "lab",
		Short: "EthPandaOps Lab - Ethereum metrics collection and analysis",
		Long:  `Lab is a tool for collecting and analyzing Ethereum metrics`,
	}

	// Add global flags
	rootCmd.PersistentFlags().StringVarP(&apiConfigPath, "api-config", "a", "api-config.yaml", "Path to the api config file")
	rootCmd.PersistentFlags().StringVarP(&srvConfigPath, "srv-config", "s", "srv-config.yaml", "Path to the srv config file")
	rootCmd.PersistentFlags().StringVarP(&logLevel, "log-level", "l", "info", "Log level")

	// Add subcommands
	rootCmd.AddCommand(createSrvCommand())
	rootCmd.AddCommand(createAPICommand())

	// Execute the root command
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %s\n", err)
		os.Exit(1)
	}
}

func loadSRVConfig(path string) (*srv.Config, error) {
	cfg, err := loadConfig(path, &srv.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to load srv config: %w", err)
	}

	srvConfig, ok := cfg.(*srv.Config)
	if !ok {
		return nil, fmt.Errorf("failed to cast config to srv.Config")
	}

	return srvConfig, nil
}

func loadAPIConfig(path string) (*api.Config, error) {
	cfg, err := loadConfig(path, &api.Config{})
	if err != nil {
		return nil, fmt.Errorf("failed to load api config: %w", err)
	}

	apiConfig, ok := cfg.(*api.Config)
	if !ok {
		return nil, fmt.Errorf("failed to cast config to api.Config")
	}

	return apiConfig, nil
}

func loadConfig(path string, as interface{}) (interface{}, error) {
	configFile, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("error reading config file: %w", err)
	}

	expanded := os.ExpandEnv(string(configFile))

	err = yaml.Unmarshal([]byte(expanded), as)
	if err != nil {
		return nil, fmt.Errorf("error parsing config file: %w", err)
	}

	return as, nil
}

func createSrvCommand() *cobra.Command {
	cmd := &cobra.Command{
		Use:   "srv",
		Short: "Run the srv service",
		Long:  `Start the srv service for business logic and data processing`,
		RunE: func(cmd *cobra.Command, args []string) error {
			ctx := cmd.Context()

			// Load config
			cfg, err := loadSRVConfig(srvConfigPath)
			if err != nil {
				return fmt.Errorf("failed to load config: %w", err)
			}

			// Create and start the srv service
			service, err := srv.New(cfg)
			if err != nil {
				return fmt.Errorf("failed to create srv service: %w", err)
			}

			return service.Start(ctx)
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
			ctx := cmd.Context()

			// Load config
			cfg, err := loadAPIConfig(apiConfigPath)
			if err != nil {
				return fmt.Errorf("failed to load config: %w", err)
			}

			// Create and start the api service
			service, err := api.New(cfg)
			if err != nil {
				return fmt.Errorf("failed to create api service: %w", err)
			}

			return service.Start(ctx)
		},
	}

	return cmd
}
