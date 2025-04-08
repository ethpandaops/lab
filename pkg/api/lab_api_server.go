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
	cacheKey := "slot:" + req.Network + ":" + strconv.FormatUint(req.Slot, 10)
	ttl := 30 * time.Second

	if cached, err := s.cache.Get(cacheKey); err == nil && cached != nil {
		resp := &apipb.BeaconSlotDataResponse{}
		_ = proto.Unmarshal(cached, resp)
		s.setCacheHeaders(ctx, cached, ttl)
		return resp, nil
	}

	resp := &apipb.BeaconSlotDataResponse{
		Network: req.Network,
		Slot:    req.Slot,
		Data:    []byte{},
	}

	data, _ := proto.Marshal(resp)
	_ = s.cache.Set(cacheKey, data, ttl)
	s.setCacheHeaders(ctx, data, ttl)
	return resp, nil
}

func (s *LabAPIServerImpl) GetBeaconSlotRange(ctx context.Context, req *apipb.GetBeaconSlotRangeRequest) (*apipb.BeaconSlotRangeResponse, error) {
	cacheKey := "slotrange:" + req.Network + ":" + strconv.FormatUint(req.Start, 10) + ":" + strconv.FormatUint(req.End, 10)
	ttl := 30 * time.Second

	if cached, err := s.cache.Get(cacheKey); err == nil && cached != nil {
		resp := &apipb.BeaconSlotRangeResponse{}
		_ = proto.Unmarshal(cached, resp)
		s.setCacheHeaders(ctx, cached, ttl)
		return resp, nil
	}

	resp := &apipb.BeaconSlotRangeResponse{
		Network: req.Network,
		Slots:   []*apipb.BeaconSlotDataResponse{},
	}

	data, _ := proto.Marshal(resp)
	_ = s.cache.Set(cacheKey, data, ttl)
	s.setCacheHeaders(ctx, data, ttl)
	return resp, nil
}

func (s *LabAPIServerImpl) GetBeaconNodes(ctx context.Context, req *apipb.GetBeaconNodesRequest) (*apipb.BeaconNodesResponse, error) {
	cacheKey := "nodes:" + req.Network
	ttl := 1 * time.Minute

	if cached, err := s.cache.Get(cacheKey); err == nil && cached != nil {
		resp := &apipb.BeaconNodesResponse{}
		_ = proto.Unmarshal(cached, resp)
		s.setCacheHeaders(ctx, cached, ttl)
		return resp, nil
	}

	resp := &apipb.BeaconNodesResponse{
		Network: req.Network,
		Nodes:   []*apipb.BeaconNode{},
	}

	data, _ := proto.Marshal(resp)
	_ = s.cache.Set(cacheKey, data, ttl)
	s.setCacheHeaders(ctx, data, ttl)
	return resp, nil
}

func (s *LabAPIServerImpl) GetTimingData(ctx context.Context, req *apipb.GetTimingDataRequest) (*apipb.TimingDataResponse, error) {
	cacheKey := "timing:" + req.Network + ":" + req.WindowName + ":" + strconv.FormatUint(req.Start, 10) + ":" + strconv.FormatUint(req.End, 10)
	ttl := 1 * time.Minute

	if cached, err := s.cache.Get(cacheKey); err == nil && cached != nil {
		resp := &apipb.TimingDataResponse{}
		_ = proto.Unmarshal(cached, resp)
		s.setCacheHeaders(ctx, cached, ttl)
		return resp, nil
	}

	resp := &apipb.TimingDataResponse{
		Network:    req.Network,
		DataPoints: []*apipb.TimingDataPoint{},
	}

	data, _ := proto.Marshal(resp)
	_ = s.cache.Set(cacheKey, data, ttl)
	s.setCacheHeaders(ctx, data, ttl)
	return resp, nil
}

func (s *LabAPIServerImpl) GetSizeCDFData(ctx context.Context, req *apipb.GetSizeCDFDataRequest) (*apipb.SizeCDFDataResponse, error) {
	cacheKey := "sizecdf:" + req.Network + ":" + strconv.FormatUint(req.Start, 10) + ":" + strconv.FormatUint(req.End, 10)
	ttl := 1 * time.Minute

	if cached, err := s.cache.Get(cacheKey); err == nil && cached != nil {
		resp := &apipb.SizeCDFDataResponse{}
		_ = proto.Unmarshal(cached, resp)
		s.setCacheHeaders(ctx, cached, ttl)
		return resp, nil
	}

	resp := &apipb.SizeCDFDataResponse{
		Network: req.Network,
		Points:  []*apipb.SizeCDFPoint{},
	}

	data, _ := proto.Marshal(resp)
	_ = s.cache.Set(cacheKey, data, ttl)
	s.setCacheHeaders(ctx, data, ttl)
	return resp, nil
}

func (s *LabAPIServerImpl) GetBeaconStateFile(ctx context.Context, req *apipb.GetBeaconStateFileRequest) (*apipb.DataFileChunk, error) {
	key := "beacon/state/" + req.Network + ".json"
	content, err := s.storage.Get(key)
	if err != nil {
		return nil, err
	}
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
