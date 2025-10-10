.PHONY: build proto vendor-protos clean-vendor run-srv run-api clean create-proto

# Use bash instead of sh for better compatibility
SHELL := /bin/bash

# Pin upstream xatu-cbt commit/branch for proto vendoring
XATU_CBT_COMMIT := 782d9d468e26aecb145e383a957d89a138ec889b

# Vendor upstream proto files
vendor-protos:
	@echo "╔══════════════════════════════════════════════════════╗"
	@echo "║           Vendoring Upstream Proto Files            ║"
	@echo "╚══════════════════════════════════════════════════════╝"
	@echo ""
	@echo "  📦 Source:  xatu-cbt@$(XATU_CBT_COMMIT)"
	@echo "  📂 Target:  vendor/xatu-cbt/"
	@echo ""
	@echo "  → Cleaning old vendor files..."
	@rm -rf vendor/xatu-cbt
	@mkdir -p vendor
	@echo "  → Fetching upstream protos..."
	@cd vendor && \
		git clone -q https://github.com/ethpandaops/xatu-cbt.git xatu-cbt-temp 2>/dev/null && \
		cd xatu-cbt-temp && \
		git checkout -q $(XATU_CBT_COMMIT) 2>/dev/null && \
		cd .. && \
		mv xatu-cbt-temp/pkg/proto xatu-cbt && \
		rm -rf xatu-cbt-temp
	@echo "  → Patching import paths..."
	@sed -i.bak 's|import "common.proto"|import "vendor/xatu-cbt/clickhouse/common.proto"|g' vendor/xatu-cbt/clickhouse/*.proto 2>/dev/null
	@sed -i.bak 's|import "clickhouse/annotations.proto"|import "vendor/xatu-cbt/clickhouse/clickhouse/annotations.proto"|g' vendor/xatu-cbt/clickhouse/*.proto 2>/dev/null
	@rm -f vendor/xatu-cbt/clickhouse/*.proto.bak
	@echo "  ✅ Vendored successfully!"
	@echo ""

# Clean vendored proto files
clean-vendor:
	@rm -rf vendor/xatu-cbt

# Generate protobuf (depends on vendored protos)
proto: vendor-protos
	@echo "╔══════════════════════════════════════════════════════╗"
	@echo "║              Generating Proto Files                 ║"
	@echo "╚══════════════════════════════════════════════════════╝"
	@echo ""
	@echo "  🔧 Backend Generation:"
	@echo "  → Generating standard Go protos..."
	@buf generate --template buf-noconnect.gen.yaml . 2>/dev/null
	@echo "  → Generating Connect RPC code..."
	@buf generate --template buf.gen.yaml --path backend/pkg/api/proto . 2>/dev/null
	@echo "  → Generating API gateway code..."
	@buf generate --template buf-api.gen.yaml . --path backend/pkg/api/proto 2>/dev/null
	@echo "  ✅ Backend protos generated!"
	@echo ""
	@echo "  🎨 Frontend Generation:"
	@echo "  → Generating TypeScript protos..."
	@cd frontend/scripts && ./generate-api.sh 2>/dev/null 1>&2
	@cd ../..
	@echo "  ✅ Frontend protos generated!"
	@echo ""
	@echo "╔══════════════════════════════════════════════════════╗"
	@echo "║                 ✅ Proto Generation Complete         ║"
	@echo "╚══════════════════════════════════════════════════════╝"

# Create a new proto file
create-proto:
	@echo "Usage: make create-proto PROTO_NAME=<n>"
	@if [ -n "$(PROTO_NAME)" ]; then \
		./scripts/create_proto.sh $(PROTO_NAME); \
	fi

# Run srv service
run-srv:
	@echo "╔══════════════════════════════════════════════════════╗"
	@echo "║              Starting SRV Service                   ║"
	@echo "╚══════════════════════════════════════════════════════╝"
	@echo ""
	@echo "  🚀 Starting backend server service..."
	@echo "  📝 Config: backend/srv-config.yaml"
	@echo ""
	@set -a && source .env && set +a && cd backend && go run pkg/cmd/main.go srv -s srv-config.yaml

# Run api service
run-api:
	@echo "╔══════════════════════════════════════════════════════╗"
	@echo "║              Starting API Service                   ║"
	@echo "╚══════════════════════════════════════════════════════╝"
	@echo ""
	@echo "  🚀 Starting API gateway service..."
	@echo "  📝 Config: backend/api-config.yaml"
	@echo "  🌐 Default: http://localhost:8888"
	@echo ""
	@set -a && source .env && set +a && cd backend && go run pkg/cmd/main.go api -a api-config.yaml

# Clean
clean: clean-vendor
	@echo "╔══════════════════════════════════════════════════════╗"
	@echo "║             Cleaning Generated Files                ║"
	@echo "╚══════════════════════════════════════════════════════╝"
	@echo ""
	@echo "  🧹 Cleaning:"
	@echo "  → Removing binaries..."
	@rm -rf bin
	@echo "  → Removing backend proto files..."
	@rm -rf backend/pkg/srv/proto/*/*.pb.go
	@rm -rf backend/pkg/srv/proto/*/*_grpc.pb.go
	@rm -rf backend/pkg/proto/*/*.pb.go
	@rm -rf backend/pkg/proto/*/*_grpc.pb.go
	@rm -rf backend/pkg/api/proto/*_grpc.pb.go
	@rm -rf backend/pkg/api/proto/protoconnect
	@rm -rf backend/pkg/api/proto/labapiconnect
	@rm -rf backend/pkg/api/proto/labapiconnectconnect
	@rm -rf backend/pkg/server/proto/*/*connect/
	@echo "  → Removing frontend generated files..."
	@rm -rf frontend/src/api/gen/
	@echo "  ✅ Clean complete!"
	@echo ""
