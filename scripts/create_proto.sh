#!/bin/bash
set -e

# Check if a proto name was provided
if [ -z "$1" ]; then
  echo "Usage: $0 <proto_name>"
  echo "Example: $0 beacon"
  exit 1
fi

PROTO_NAME=$1
PROTO_DIR="pkg/srv/proto/$PROTO_NAME"

# Check if directory already exists
if [ -d "$PROTO_DIR" ]; then
  echo "Error: Protocol directory $PROTO_DIR already exists"
  exit 1
fi

# Create the directory
mkdir -p "$PROTO_DIR"

# Create the proto file
cat > "$PROTO_DIR/$PROTO_NAME.proto" << EOF
syntax = "proto3";

package $PROTO_NAME;

import "google/protobuf/timestamp.proto";

option go_package = "github.com/ethpandaops/lab/pkg/server/proto/$PROTO_NAME";

// Add your message and service definitions here

EOF

# Add the new directory to buf.work.yaml
if ! grep -q "$PROTO_DIR" buf.work.yaml; then
  # Use awk to append to the directories section
  awk -i inplace '/directories:/ { print; print "  - '"$PROTO_DIR"'"; next } { print }' buf.work.yaml
  echo "Added $PROTO_DIR to buf.work.yaml"
else
  echo "$PROTO_DIR already in buf.work.yaml"
fi

echo "Created new proto file: $PROTO_DIR/$PROTO_NAME.proto"
echo "Now edit the file to add your message and service definitions"
echo "Then run 'make proto' to generate the Go code" 