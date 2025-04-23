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

echo "Generating frontend API code using buf..."
# Use buf generate with the updated buf.gen.yaml
buf generate

echo "Frontend API code generated successfully in $OUTPUT_DIR!"