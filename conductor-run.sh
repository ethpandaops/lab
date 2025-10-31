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
VITE_PORT=$(find_available_port 5173)
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

# Create log files for capturing output
VITE_LOG=$(mktemp)
STORYBOOK_LOG=$(mktemp)

# Start Vite dev server in background
echo "📦 Starting Vite dev server..."
PORT=$VITE_PORT pnpm dev > "$VITE_LOG" 2>&1 &
VITE_PID=$!

# Start Storybook in background
echo "📚 Starting Storybook..."
pnpm exec storybook dev -p $STORYBOOK_PORT --no-open > "$STORYBOOK_LOG" 2>&1 &
STORYBOOK_PID=$!

# Wait for servers to be ready and capture their ports
echo "⏳ Waiting for servers to start..."

# Wait for Vite to output its port
ACTUAL_VITE_PORT=""
for i in {1..30}; do
    if [ -f "$VITE_LOG" ]; then
        ACTUAL_VITE_PORT=$(grep -oE "http://localhost:[0-9]+" "$VITE_LOG" | grep -oE "[0-9]+" | head -1)
        if [ -n "$ACTUAL_VITE_PORT" ]; then
            break
        fi
    fi
    sleep 0.2
done

# Wait for Storybook to output its port
ACTUAL_STORYBOOK_PORT=""
for i in {1..30}; do
    if [ -f "$STORYBOOK_LOG" ]; then
        ACTUAL_STORYBOOK_PORT=$(grep -oE "Local:.*http://localhost:[0-9]+" "$STORYBOOK_LOG" | grep -oE "[0-9]+" | head -1)
        if [ -n "$ACTUAL_STORYBOOK_PORT" ]; then
            break
        fi
    fi
    sleep 0.2
done

# Fallback to expected ports if detection failed
ACTUAL_VITE_PORT=${ACTUAL_VITE_PORT:-$VITE_PORT}
ACTUAL_STORYBOOK_PORT=${ACTUAL_STORYBOOK_PORT:-$STORYBOOK_PORT}

echo ""
echo "✅ Both servers are running!"
echo ""
echo "   📦 Frontend:   http://localhost:$ACTUAL_VITE_PORT"
echo "   📚 Storybook:  http://localhost:$ACTUAL_STORYBOOK_PORT"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Cleanup temp log files on exit
cleanup_logs() {
    rm -f "$VITE_LOG" "$STORYBOOK_LOG"
    kill $TAIL_PID 2>/dev/null || true
}
trap "cleanup; cleanup_logs" SIGINT SIGTERM EXIT

# Tail both log files to show output
tail -f "$VITE_LOG" "$STORYBOOK_LOG" &
TAIL_PID=$!

# Wait for both processes
wait $VITE_PID $STORYBOOK_PID
