# Lab Backend

The Lab backend is a Go application that collects and analyzes Ethereum metrics.

## Architecture

The backend is designed as a single binary with two main components:

1. **SRV** - Business logic service that handles data processing, scheduled tasks, and storage.
2. **API** - Client-facing service that provides HTTP/WebSocket endpoints and handles caching.

### Technologies

- **ClickHouse** - Analytics database for storing and querying large volumes of data
- **MinIO (S3)** - Object storage for storing processed data
- **Temporal** - Workflow engine for reliable, long-running tasks and scheduling
- **NATS** - Messaging system for event-driven communication between services

## Getting Started

### Prerequisites

- Go 1.21+
- Docker and Docker Compose (for development environment)

### Running Locally

1. Start the required services using Docker Compose:

```bash
docker-compose -f docker-compose.dev.yaml up -d
```

2. Create a configuration file (or use the default `config.example.yaml`):

```bash
cp config.example.yaml config.yaml
```

3. Run the srv service:

```bash
make run-srv
```

4. Run the api service (in a separate terminal):

```bash
make run-api
```

### Building

To build the binary:

```bash
make build
```

This will create a `bin/lab` binary that can be used to run either service:

```bash
# Run srv service
./bin/lab srv

# Run api service
./bin/lab api
```

## Development

### Protobuf Generation

To generate protobuf code:

```bash
make proto
```

### Project Structure

- `cmd/` - Command-line interface
- `pkg/` - Backend code
  - `api/` - API service
  - `srv/` - Business logic service
  - `config/` - Configuration management
  - `logger/` - Logging utilities
  - `storage/` - S3 storage interface
  - `clickhouse/` - ClickHouse client
  - `temporal/` - Temporal workflows and activities
  - `nats/` - NATS client
- `proto/` - Protocol buffer definitions

## Deployment

For production deployment, build the binary and deploy it with the required configuration:

```bash
make build
./bin/lab [srv|api] --config=/path/to/config.yaml
``` 