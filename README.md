# ethPandaOps Lab

The ethPandaOps Lab is a comprehensive platform for exploring, analyzing, and visualizing Ethereum network data. It provides interactive dashboards and insights from various data sources, focusing on network health, client diversity, and validator performance across multiple Ethereum networks.

## Features

- **Multi-Network Support**: Data visualization for Mainnet, Sepolia, Holesky, and other Ethereum networks
- **Xatu Integration**: Insights from Xatu, a beacon chain event collector and metrics exporter
- **Beacon Chain Analytics**: Detailed metrics on block timings, slot performance, and network health
- **Community Node Tracking**: Visualization of community-run nodes and their geographical distribution
- **Fork Readiness**: Monitoring of client readiness for upcoming network forks
- **Interactive Visualizations**: Rich, interactive charts and maps for data exploration

## Architecture

The application consists of:

```
├── backend/           # Python-based data processing and API backend
├── frontend/          # React-based user interface
├── public/            # Static assets
└── docker-compose.yaml # Container orchestration for local development
```

### Backend

The backend is built with Python and provides:
- Data processing modules for different data sources
- Integration with Clickhouse for data querying
- S3-compatible storage for processed data
- Configuration for multiple Ethereum networks

### Frontend

The frontend is built with:
- React 18
- TypeScript
- Tailwind CSS
- React Query for data fetching
- Recharts and D3 for data visualization
- React Router for navigation

## Setup and Installation

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.10+ (for local backend development)

### Using Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/ethpandaops/lab.git
   cd lab
   ```

2. Create a `.env` file based on the example:
   ```bash
   cp .env.example .env
   ```

3. Start the application:
   ```bash
   docker-compose up
   ```

The application will be available at http://localhost:3000.

## Development

### Backend Development

1. Set up a Python virtual environment:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Create a configuration file:
   ```bash
   cp config.example.yaml config.yaml
   ```

3. Run the backend:
   ```bash
   python -m lab
   ```

### Frontend Development

1. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Create environment file:
   ```bash
   cp .env.example .env
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend development server will be available at http://localhost:5173.

## Deployment

The application can be deployed using Docker Compose for production environments, or the frontend and backend can be deployed separately:

- Frontend: Can be deployed to static hosting services like Cloudflare Pages, Vercel, or Netlify
- Backend: Can be deployed as a containerized service on cloud platforms

## Contributing

Contributions to the ethPandaOps Lab are welcome! Please feel free to submit issues or pull requests to the [GitHub repository](https://github.com/ethpandaops/lab).

## License

This project is licensed under the MIT License - see the LICENSE file for details. 