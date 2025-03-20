.PHONY: build proto run-srv run-api clean

# Build all
build: proto build-binary

# Build binary
build-binary:
	@echo "Building binary..."
	go build -o bin/lab cmd/main.go

# Generate protobuf
proto:
	@echo "Generating protobuf code..."
	protoc --go_out=. --go_opt=paths=source_relative \
		--go-grpc_out=. --go-grpc_opt=paths=source_relative \
		proto/metrics/metrics.proto

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
	rm -rf proto/metrics/*.go 