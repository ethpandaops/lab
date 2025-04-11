package api

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strconv"
	"time"

	apipb "github.com/ethpandaops/lab/pkg/api/proto"
	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"google.golang.org/grpc"
	"google.golang.org/grpc/metadata"
	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/emptypb"
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

func (s *LabAPIServerImpl) GetFrontendConfig(ctx context.Context, _ *emptypb.Empty) (*apipb.FrontendConfigResponse, error) {
	cacheKey := "frontend_config"
	ttl := 2 * time.Minute

	if cached, err := s.cache.Get(cacheKey); err == nil && cached != nil {
		resp := &apipb.FrontendConfigResponse{}
		_ = proto.Unmarshal(cached, resp)
		s.setCacheHeaders(ctx, cached, ttl)
		return resp, nil
	}

	// Proxy to existing backend (placeholder)
	resp := &apipb.FrontendConfigResponse{
		NetworkName: "mainnet",
		Environment: "production",
		Settings:    map[string]string{"example": "value"},
	}

	data, _ := proto.Marshal(resp)
	_ = s.cache.Set(cacheKey, data, ttl)
	s.setCacheHeaders(ctx, data, ttl)
	return resp, nil
}

func (s *LabAPIServerImpl) GetBeaconSlotData(ctx context.Context, req *apipb.GetBeaconSlotDataRequest) (*apipb.BeaconSlotDataResponse, error) {
	key := "slots/" + req.Network + "/" + strconv.FormatUint(req.Slot, 10) + ".json"
	content, err := s.storage.Get(key)
	if err != nil {
		return nil, err
	}
	grpc.SetHeader(ctx, metadata.Pairs(
		"Content-Type", "application/json",
		"Cache-Control", "max-age=3600",
	))
	return &apipb.BeaconSlotDataResponse{Network: req.Network, Slot: req.Slot, Data: content}, nil
}

func (s *LabAPIServerImpl) GetBeaconSlotRange(ctx context.Context, req *apipb.GetBeaconSlotRangeRequest) (*apipb.BeaconSlotRangeResponse, error) {
	key := "slots/" + req.Network + "/range.json"
	_, err := s.storage.Get(key)
	if err != nil {
		return nil, err
	}
	grpc.SetHeader(ctx, metadata.Pairs(
		"Content-Type", "application/json",
		"Cache-Control", "max-age=3600",
	))
	return &apipb.BeaconSlotRangeResponse{Network: req.Network}, nil
}

func (s *LabAPIServerImpl) GetBeaconNodes(ctx context.Context, req *apipb.GetBeaconNodesRequest) (*apipb.BeaconNodesResponse, error) {
	key := "nodes/" + req.Network + ".json"
	_, err := s.storage.Get(key)
	if err != nil {
		return nil, err
	}
	grpc.SetHeader(ctx, metadata.Pairs(
		"Content-Type", "application/json",
		"Cache-Control", "max-age=3600",
	))
	return &apipb.BeaconNodesResponse{Network: req.Network}, nil
}

func (s *LabAPIServerImpl) GetTimingData(ctx context.Context, req *apipb.GetTimingDataRequest) (*apipb.TimingDataResponse, error) {
	key := "block_timings/" + req.Network + "/" + req.WindowName + ".json"
	_, err := s.storage.Get(key)
	if err != nil {
		return nil, err
	}
	grpc.SetHeader(ctx, metadata.Pairs(
		"Content-Type", "application/json",
		"Cache-Control", "max-age=3600",
	))
	return &apipb.TimingDataResponse{Network: req.Network}, nil
}

func (s *LabAPIServerImpl) GetSizeCDFData(ctx context.Context, req *apipb.GetSizeCDFDataRequest) (*apipb.SizeCDFDataResponse, error) {
	key := "size_cdf/" + req.Network + "/" + strconv.FormatUint(req.Start, 10) + "_" + strconv.FormatUint(req.End, 10) + ".json"
	_, err := s.storage.Get(key)
	if err != nil {
		return nil, err
	}
	grpc.SetHeader(ctx, metadata.Pairs(
		"Content-Type", "application/json",
		"Cache-Control", "max-age=3600",
	))
	return &apipb.SizeCDFDataResponse{Network: req.Network}, nil
}

func (s *LabAPIServerImpl) GetBeaconStateFile(ctx context.Context, req *apipb.GetBeaconStateFileRequest) (*apipb.DataFileChunk, error) {
	key := "state/modules/" + req.Network + ".json"
	content, err := s.storage.Get(key)
	if err != nil {
		return nil, err
	}
	grpc.SetHeader(ctx, metadata.Pairs(
		"Content-Type", "application/json",
		"Cache-Control", "max-age=3600",
	))
	return &apipb.DataFileChunk{Content: content}, nil
}

func (s *LabAPIServerImpl) GetBeaconSlotFile(ctx context.Context, req *apipb.GetBeaconSlotFileRequest) (*apipb.DataFileChunk, error) {
	key := "slots/" + req.Network + "/" + strconv.FormatUint(req.Slot, 10) + ".json"
	content, err := s.storage.Get(key)
	if err != nil {
		return nil, err
	}
	return &apipb.DataFileChunk{Content: content}, nil
}

func (s *LabAPIServerImpl) GetStatus(ctx context.Context, _ *emptypb.Empty) (*apipb.StatusResponse, error) {
	resp := &apipb.StatusResponse{
		Status:  "ok",
		Version: "v0.1.0",
	}

	return resp, nil
}

func (s *LabAPIServerImpl) setCacheHeaders(ctx context.Context, data []byte, ttl time.Duration) {
	md := metadata.Pairs(
		"Cache-Control", "public, max-age="+strconv.Itoa(int(ttl.Seconds())),
		"ETag", generateETag(data),
		"Last-Modified", time.Now().UTC().Format(http.TimeFormat),
		"Content-Type", "application/json",
	)
	_ = grpc.SendHeader(ctx, md)
}

func generateETag(data []byte) string {
	hash := sha256.Sum256(data)
	return `"` + hex.EncodeToString(hash[:]) + `"`
}
