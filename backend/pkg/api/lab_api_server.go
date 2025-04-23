package api

import (
	apipb "github.com/ethpandaops/lab/backend/pkg/api/proto"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/backend/pkg/internal/lab/storage"
)

type LabAPIServerImpl struct {
	apipb.UnimplementedLabAPIServer

	cache   cache.Client
	storage storage.Client
}

func NewLabAPIServer(cacheClient cache.Client, storageClient storage.Client) *LabAPIServerImpl {
	return &LabAPIServerImpl{
		cache:   cacheClient,
		storage: storageClient,
	}
}
