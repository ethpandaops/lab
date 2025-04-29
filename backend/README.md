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

- Go 1.24 or later
- Redis (for caching)
- ClickHouse (for data storage)
- MinIO/S3 (for object storage)

## Setup

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/ethpandaops/lab.git
   cd lab
   ```

2. Install dependencies:
   ```bash
   go mod download
   ```

3. Generate Protocol Buffer code:
   ```bash
   make proto
   ```

4. Set up required services using Docker Compose:
   ```bash
   docker-compose up -d redis minio createbuckets
   ```

5. Configure environment variables (copy from `.env.example` at the root):
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## Configuration

The backend services are configured using YAML files and environment variables:

### Server (SRV) Service Configuration

The server service is configured via `service.config.yaml`:

```yaml
# Log level
logLevel: "info"

# GRPC server configuration
grpc:
  host: "0.0.0.0"
  port: 6666

# S3 storage configuration
storage:
  endpoint: "${S3_ENDPOINT}"
  region: "${S3_REGION}"
  bucket: "${S3_BUCKET}"
  accessKey: "${S3_ACCESS_KEY}"
  secretKey: "${S3_SECRET_KEY}"
  secure: false
  usePathStyle: true

# Ethereum configuration
ethereum:
  networks:
    mainnet:
      name: "mainnet"
      configURL: "https://raw.githubusercontent.com/eth-clients/mainnet/refs/heads/main/metadata/config.yaml"
      genesis: "2020-12-01T12:00:23Z"
      xatu:
        dsn: "${XATU_CLICKHOUSE_URL}"
        protocol: "native"

# Cache configuration
cache:
  type: "redis"
  config:
    url: "${REDIS_URL}"
    defaultTTL: 60

# Modules configuration
modules:
  beacon_slots:
    enabled: true
    # Additional module-specific configuration...
  beacon_chain_timings:
    enabled: true
    # Additional module-specific configuration...
  xatu_public_contributors:
    enabled: true
    # Additional module-specific configuration...
```

### API Service Configuration

The API service is configured via `api.config.yaml`:

```yaml
# Log level
logLevel: "info"

# HTTP server configuration
httpServer:
  host: "${API_HOST}"
  port: ${API_PORT}
  pathPrefix: "lab-data"
  corsAllowAll: true

# SRV client configuration
srvClient:
  address: "${SRV_ADDRESS}"

# Cache configuration
cache:
  type: "redis"
  config:
    url: "${REDIS_URL}"
    defaultTTL: 60

# S3 storage configuration
storage:
  endpoint: "${S3_ENDPOINT}"
  region: "${S3_REGION}"
  bucket: "${S3_BUCKET}"
  accessKey: "${S3_ACCESS_KEY}"
  secretKey: "${S3_SECRET_KEY}"
  secure: false
  usePathStyle: true
```

## Running the Services

### Running Locally

1. Start the server (SRV) service:
   ```bash
   go run backend/pkg/cmd/main.go srv --srv-config path/to/service.config.yaml
   ```

2. Start the API service:
   ```bash
   go run backend/pkg/cmd/main.go api --api-config path/to/api.config.yaml
   ```

### Using Docker Compose

The project includes Docker Compose configurations for easy deployment:

```bash
# Start backend services (server and API)
docker-compose --profile backend up -d

# Start all services including frontend
docker-compose up -d
```

## Development

### Code Structure

- **pkg/cmd/main.go**: Entry point for both services
- **pkg/server/**: Server service implementation
- **pkg/api/**: API service implementation
- **pkg/internal/lab/**: Shared internal packages

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
2. **beacon_chain_timings**: Analyzes beacon chain timing metrics
3. **xatu_public_contributors**: Tracks Xatu public contributors

## Metrics

The backend exposes Prometheus metrics for monitoring:

- HTTP server metrics
- Cache performance metrics
- Ethereum network metrics
- Module-specific metrics

## Docker

The backend can be containerized using the provided Dockerfile:

```bash
# Build the Docker image
docker build -t ethpandaops/lab-backend -f backend/Dockerfile .

# Run the server service
docker run -p 6666:6666 -v /path/to/config.yaml:/app/config.yaml ethpandaops/lab-backend srv --srv-config /app/config.yaml

# Run the API service
docker run -p 8080:8080 -v /path/to/config.yaml:/app/config.yaml ethpandaops/lab-backend api --api-config /app/config.yaml