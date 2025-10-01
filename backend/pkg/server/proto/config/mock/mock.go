package mock

//go:generate mockgen -package mock -destination config_client.go github.com/ethpandaops/lab/backend/pkg/server/proto/config ConfigServiceClient
