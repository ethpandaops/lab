.PHONY: build proto run-srv run-api clean create-proto

# Generate protobuf
proto:
	@echo "Generating non-Connect Go code..."
	# Generate Go code without Connect for all protos
	buf generate --template buf-noconnect.gen.yaml .
	
	@echo "Generating Connect code for API protos only..."
	# Generate Connect code only for API protos
	buf generate --template buf.gen.yaml --path backend/pkg/api/proto .

	@echo "Generating API gateway code..."
	buf generate --template buf-api.gen.yaml . --path backend/pkg/api/proto

	@echo "Generating frontend TypeScript protos..."
	cd frontend/scripts && ./generate-api.sh
	cd ../..

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
	rm -rf backend/pkg/api/proto/*_grpc.pb.go
	rm -rf backend/pkg/api/proto/protoconnect
	rm -rf backend/pkg/api/proto/labapiconnect 
	rm -rf backend/pkg/api/proto/labapiconnectconnect
	rm -rf backend/pkg/server/proto/*/*connect/
	rm -rf frontend/src/api/gen/