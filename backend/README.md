# Lab Backend

The backend component of the EthPandaOps Lab project, providing Ethereum metrics collection, analysis, and API services.

## Overview

Lab Backend is a Go-based application that collects, processes, and serves Ethereum blockchain metrics. It consists of two main services:

1. **Server (SRV) Service**: Handles business logic, data processing, and metrics collection
2. **API Service**: Provides client-facing endpoints for accessing processed data

## Architecture

The backend is built with a modular architecture:

```
backend/
├── pkg/
│   ├── api/         # API service implementation
│   ├── cmd/         # Command-line entry points
│   ├── internal/    # Internal packages
│   │   └── lab/     # Core functionality
│   │       ├── cache/       # Caching implementations
│   │       ├── clickhouse/  # ClickHouse database client
│   │       ├── ethereum/    # Ethereum network interactions
│   │       └── metrics/     # Prometheus metrics
│   └── server/      # Server service implementation
│       ├── internal/        # Server internal components
│       └── proto/           # Protocol buffer definitions
├── Dockerfile       # Container definition
├── go.mod           # Go module definition
└── go.sum           # Go module checksums
```

## Requirements

- Go 1.24.5 or later
- Redis (for caching)
- ClickHouse (for data storage - optional, only if using Xatu integration)
- MinIO/S3 (for object storage)
- Make (for build commands)

## Setup

There are two ways to run the backend services:

### Option 1: Using Docker Compose

The simplest way is to use Docker Compose from the project root:

```bash
# From the project root
cp .env.example .env
docker-compose up -d
```

This will start all services including the backend. No additional setup required.

### Option 2: Local Development Setup

For active backend development:

1. **Prerequisites:**
   ```bash
   # Ensure you're in the project root
   cd lab
   ```

2. **Generate Protocol Buffer code:**
   ```bash
   make proto
   ```

3. **Set up infrastructure services:**
   ```bash
   # Start Redis and MinIO only
   docker-compose --profile infra up -d
   ```

4. **Configure environment:**
   ```bash
   # Create .env file
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Create configuration files:**
   ```bash
   # Copy example configs
   cp deploy/docker-compose/service.config.yaml srv-config.yaml
   cp deploy/docker-compose/api.config.yaml api-config.yaml
   # Edit configs as needed
   ```
6. **Run services:**
```bash
# Terminal 1: Start the SRV service
make run-srv
# Automatically loads .env and runs:
# go run backend/pkg/cmd/main.go srv -s srv-config.yaml

# Terminal 2: Start the API service
make run-api
# Automatically loads .env and runs:
# go run backend/pkg/cmd/main.go api -a api-config.yaml
```

## Configuration

The backend services are configured using YAML files and environment variables:

**Server (SRV) Service Configuration:**

The server service is configured via `srv-config.yaml`.

See [deploy/docker-compose/service.config.yaml](../deploy/docker-compose/service.config.yaml) for a complete example.

**API Service Configuration:**

The API service is configured via `api-config.yaml`.

See [deploy/docker-compose/api.config.yaml](../deploy/docker-compose/api.config.yaml) for a complete example.

### Available Make Commands

```bash
make proto      # Generate Protocol Buffer code
make build      # Build the binary
make run-srv    # Run the SRV service
make run-api    # Run the API service
make clean      # Clean generated files
```

## Development

### Protocol Buffers

The backend uses Protocol Buffers for API definitions and gRPC communication:

1. Generate Protocol Buffer code:
   ```bash
   make proto
   ```

2. Create a new Protocol Buffer file:
   ```bash
   make create-proto PROTO_NAME=my_new_proto
   ```

### Testing

The backend includes comprehensive tests for all components:

```bash
# Run all tests
go test ./...

# Run tests with coverage
go test -cover ./...

# Run specific tests
go test ./pkg/internal/lab/cache
```

## Caching

The backend supports two caching implementations:

1. **Memory Cache**: Simple in-memory cache for single-process deployments
2. **Redis Cache**: Distributed cache for multi-process deployments

See `pkg/internal/lab/cache/README.md` for detailed documentation.

## Data Storage

The backend uses:

1. **ClickHouse**: For time-series data storage and analytics
2. **S3/MinIO**: For object storage (JSON files, reports, etc.)

## Modules

The server service includes several modules for different data collection and processing tasks:

1. **beacon_slots**: Collects and processes beacon chain slot data
   - Supports head tracking, trailing slots, and backfilling
   - Tracks locally built blocks

2. **beacon_chain_timings**: Analyzes beacon chain timing metrics
   - Configurable time windows for different analysis periods
   - Generates timing statistics and distributions

3. **xatu_public_contributors**: Tracks Xatu public contributors
   - Time-windowed contributor statistics
   - Redis-based caching for performance


## Metrics

The backend exposes Prometheus metrics for monitoring:

- HTTP server metrics
- Cache performance metrics
- Ethereum network metrics
- Module-specific metrics
