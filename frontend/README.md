# ethPandaOps Lab Frontend

The frontend component of the ethPandaOps Lab project, providing interactive dashboards and visualizations for Ethereum network data.

## Overview

This React-based frontend application provides a user interface for exploring and analyzing Ethereum blockchain metrics collected by the Lab backend. It features interactive dashboards, charts, maps, and visualizations for monitoring network health, client diversity, and validator performance across multiple Ethereum networks.

## Features

- **React 18** with **TypeScript** and **Vite** for fast, modern development
- **Tailwind CSS** for responsive, utility-first styling
- **React Query** for efficient server state management
- **React Router** for client-side routing
- **D3.js** and **Recharts** for advanced data visualizations
- **Globe.gl** and **React Simple Maps** for geographical visualizations
- **Framer Motion** for smooth animations and transitions
- **Headless UI** and **Heroicons** for accessible UI components

## Requirements

- Node.js 18 or later
- pnpm (recommended) or npm

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ethpandaops/lab.git
   cd lab/frontend
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

## Development

### Running the Development Server

Start the development server:

```bash
pnpm dev
```

The development server will be available at http://localhost:5173 and will automatically open in your default browser.

### Backend Connection

By default, the frontend connects to the backend API through a Vite proxy configuration. This allows you to run the frontend independently while still accessing backend data.

The frontend supports two separate backend URLs:

1. **Legacy Backend URL** (`VITE_BACKEND_URL`): Used for gRPC endpoints and static JSON files. This URL typically includes the `/lab-data` suffix.
   ```
   VITE_BACKEND_URL=https://lab-api.primary.production.platform.ethpandaops.io/lab-data
   ```

2. **REST API URL** (`VITE_REST_API_URL`): Used for new v1 REST API endpoints (`/api/v1/*`). This URL should NOT include the `/lab-data` suffix.
   ```
   VITE_REST_API_URL=https://lab-api.primary.production.platform.ethpandaops.io
   ```

If `VITE_REST_API_URL` is not set, the system will fall back to using `VITE_BACKEND_URL` (automatically stripping `/lab-data` if present).

This dual-URL configuration allows you to:
- Point to different servers for legacy and new endpoints
- Gradually migrate from static data to REST APIs
- Support different deployment scenarios

## Scripts

- `pnpm dev` - Start the development server with hot reload
- `pnpm build` - Build for production (output to `dist` folder)
- `pnpm preview` - Preview the production build locally
- `pnpm format` - Format all files with Prettier
- `pnpm lint` - Run TypeScript, ESLint, and Stylelint checks
- `pnpm validate` - Run linting, tests, and e2e tests for CI

## Building for Production

Build the application for production:

```bash
pnpm build
```

The built files will be in the `dist` directory, ready to be deployed to a static hosting service.

## Docker

The frontend can be built and run using Docker:

```bash
# Build the Docker image
docker build -t ethpandaops/lab-frontend -f frontend/Dockerfile .

# Run the container
docker run -p 3000:80 ethpandaops/lab-frontend
```

Alternatively, use Docker Compose:

```bash
docker-compose --profile frontend up
```

## Integration with Backend

The frontend communicates with the Lab backend API to fetch data for visualization. It uses a configuration system that supports:

1. Local development with Vite proxy
2. Production deployment with a bootstrap configuration
3. Environment variable overrides for flexible deployment

See `src/config.ts` for implementation details.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
