#!/bin/bash
set -e

echo "🚀 Starting Lab development servers..."
echo ""

# Function to find an available port
find_available_port() {
    local start_port=$1
    local port=$start_port
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; do
        port=$((port + 1))
    done
    echo $port
}

# Determine ports
VITE_PORT=${PORT:-5173}
STORYBOOK_PORT=$(find_available_port 6006)

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    kill $VITE_PID 2>/dev/null || true
    kill $STORYBOOK_PID 2>/dev/null || true
    exit
}

# Trap SIGINT and SIGTERM
trap cleanup SIGINT SIGTERM

# Start Vite dev server in background
echo "📦 Starting Vite dev server on port $VITE_PORT..."
pnpm dev &
VITE_PID=$!

# Start Storybook in background (using storybook CLI directly to override port)
echo "📚 Starting Storybook on port $STORYBOOK_PORT..."
pnpm exec storybook dev -p $STORYBOOK_PORT --no-open &
STORYBOOK_PID=$!

# Wait a moment for servers to start
sleep 2

echo ""
echo "✅ Both servers are running!"
echo ""
echo "   📦 Frontend:   http://localhost:$VITE_PORT"
echo "   📚 Storybook:  http://localhost:$STORYBOOK_PORT"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for both processes
wait
