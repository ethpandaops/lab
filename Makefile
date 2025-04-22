.PHONY: build proto run-srv run-api clean create-proto

# Generate protobuf
proto:
	@echo "Generating protobuf code..."
	buf generate --path backend/pkg/server/proto/beacon_chain_timings
	buf generate --path backend/pkg/server/proto/lab
	buf generate --path backend/pkg/server/proto/xatu_public_contributors
	buf generate --path backend/pkg/server/proto/beacon_slots
	buf generate --path backend/pkg/api/proto

	buf generate --template buf-api.gen.yaml . --path pkg/api/proto

# Create a new proto file
create-proto:
	@echo "Usage: make create-proto PROTO_NAME=<n>"
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
	rm -rf backend/pkg/srv/proto/*/*.pb.go
	rm -rf backend/pkg/srv/proto/*/*_grpc.pb.go
	rm -rf backend/pkg/proto/*/*.pb.go
	rm -rf backend/pkg/proto/*/*_grpc.pb.go
	rm -rf backend/pkg/api/proto/*.pb.gw.go 