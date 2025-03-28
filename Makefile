.PHONY: build proto run-srv run-api clean create-proto

# Build all
build: proto build-binary

# Build binary
build-binary:
	@echo "Building binary..."
	go build -o bin/lab cmd/main.go

# Generate protobuf
proto:
	@echo "Generating protobuf code..."
	buf generate --path pkg/srv/proto/beacon_chain_timings
	buf generate --path pkg/srv/proto/lab
	buf generate --path pkg/srv/proto/xatu_public_contributors

# Create a new proto file
create-proto:
	@echo "Usage: make create-proto PROTO_NAME=<name>"
	@if [ -n "$(PROTO_NAME)" ]; then \
		./scripts/create_proto.sh $(PROTO_NAME); \
	fi

# Run srv service
run-srv:
	@echo "Running srv service..."
	go run cmd/main.go srv

# Run api service
run-api:
	@echo "Running api service..."
	go run cmd/main.go api

# Clean
clean:
	@echo "Cleaning..."
	rm -rf bin
	rm -rf pkg/srv/proto/*/*.pb.go
	rm -rf pkg/srv/proto/*/*_grpc.pb.go 