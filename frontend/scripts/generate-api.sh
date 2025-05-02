#!/bin/bash

# Script to generate frontend API types and client stub from Protobuf definitions

set -e

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Navigate two levels up to the project root (where buf.yaml is)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "Navigating to project root: $PROJECT_ROOT"
cd "$PROJECT_ROOT"

# Optional: Clean the output directory before generating
OUTPUT_DIR="frontend/src/api/gen"
echo "Cleaning previous generated files in $OUTPUT_DIR..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR" # Ensure the directory exists

echo "Generating TypeScript message types for all protos..."
# Generate TypeScript message types for all protos
buf generate --template buf-frontend-types.gen.yaml

echo "Generating Connect for API protos only..."
# Generate Connect-web for API protos only
buf generate --template buf-frontend-connect.gen.yaml --path backend/pkg/api/proto

echo "Frontend API code generated successfully in $OUTPUT_DIR!"