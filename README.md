# ethPandaOps Lab

![Lab](./public/header.png)

The ethPandaOps Lab is our high velocity, experimental platform for exploring new ideas and concepts in the Ethereum ecosystem. The Lab aims to provide insights that are not viable with standard observability tools like Grafana or Prometheus.

The codebase is built with a focus on developer experience and integration with LLM's to quickly iterate on ideas.

## Features

- **Multi-Network Support**: Data collection and analytics for multiple Ethereum networks
- **Xatu Integration**: Insights from Xatu, an Ethereum event collector and metrics exporter

## Architecture

The application consists of:

```
├── backend/                # Go implementation (main codebase)
│   ├── pkg/                # Core packages
│   │   ├── api/            # API service (client-facing)
│   │   ├── server/         # SRV service (business logic, data processing)
│   │   │   ├── internal/   # Internal server components
│   │   │   │   ├── grpc/   # gRPC server implementation
│   │   │   │   └── service/# Service implementations (beacon_slots, beacon_chain_timings, xatu_public_contributors, etc.)
│   │   │   └── proto/      # Protocol buffer definitions
│   │   └── internal/       # Shared internal packages
│   │       ├── cache/      # Caching implementations (Redis, memory)
│   │       ├── ethereum/   # Ethereum-specific utilities
│   │       └── lab/        # Core lab functionality
├── frontend/               # React frontend (see frontend/README.md)
├── scripts/                # Utility scripts
└── deploy/                 # Deployment configurations
```

### Backend (Go)

The backend is implemented in Go as a single binary with two main services:

- **SRV Service**: Handles business logic, data processing, and metrics collection
- **API Service**: Provides client-facing HTTP/REST endpoints

For detailed backend architecture, modules, and technologies, see [backend/README.md](backend/README.md).

### Frontend (React)

The frontend is a React application that visualizes the data collected by the backend. See [frontend/README.md](frontend/README.md) for development details.

## Setup and Installation

### Backend

See [backend/README.md](backend/README.md)

### Frontend

See [frontend/README.md](backend/README.md)

### Docker Compose Profiles:

You can also start specific components:

```bash
# Infrastructure only (Redis, MinIO)
docker-compose --profile infra up -d

# Backend services only (API and SRV)
docker-compose --profile backend up -d

# Frontend only
docker-compose --profile frontend up -d
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure as needed. Key variables include:

### Configuration Files

For detailed configuration information:
- **Backend**: See [backend/README.md](backend/README.md)
- **Frontend**: See [frontend/README.md](backend/README.md)
- **Docker Compose**: Uses configs from `deploy/docker-compose/` automatically
- **Manual Setup**: Copy configs from `deploy/docker-compose/` to project root

## Contributing

Contributions to the ethPandaOps Lab are welcome! Please feel free to submit issues or pull requests to the [GitHub repository](https://github.com/ethpandaops/lab).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
