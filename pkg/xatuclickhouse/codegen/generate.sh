#!/bin/bash

# This script runs the code generator to create query methods for Xatu ClickHouse tables

set -e

# Get script directory
SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

# Make sure directory structure exists
mkdir -p ../models

# Build and run the generator
echo "Building query method generator..."
go build -o generator generate_query_methods.go

echo "Generating query methods..."
./generator

# Clean up
echo "Cleaning up..."
rm -f generator

echo "Generation complete! Check the updated files in pkg/xatuclickhouse/" 