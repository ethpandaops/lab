package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"syscall"
	"time"

	"github.com/ethpandaops/lab/pkg/internal/lab"
	"github.com/ethpandaops/lab/pkg/internal/lab/cache"
	"github.com/ethpandaops/lab/pkg/internal/lab/discovery"
	"github.com/ethpandaops/lab/pkg/internal/lab/storage"
	"github.com/gorilla/mux"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/types/known/emptypb"

	apipb "github.com/ethpandaops/lab/pkg/api/proto"
)

// Service represents the api service
type Service struct {
	config        *Config
	ctx           context.Context
	cancel        context.CancelFunc
	router        *mux.Router
	server        *http.Server
	grpcServer    *grpc.Server
	grpcListener  net.Listener
	restServer    *http.Server
	lab           *lab.Lab
	cacheClient   cache.Client
	storageClient storage.Client
	discovery     discovery.Discovery

	// gRPC connection to srv service
	srvConn   *grpc.ClientConn
	srvClient apipb.LabAPIClient
}

// New creates a new api service
func New(config *Config, logLevel string, serviceMap map[string]string) (*Service, error) {
	labInst, err := lab.New(lab.Config{
		LogLevel: logLevel,
	}, "lab.ethpandaops.io.api")
	if err != nil {
		return nil, fmt.Errorf("failed to create lab instance: %w", err)
	}

	cacheClient, err := labInst.NewCache(config.Cache)
	if err != nil {
		return nil, fmt.Errorf("failed to create cache client: %w", err)
	}

	storageClient, err := labInst.NewStorage(nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create storage client: %w", err)
	}

	disc := discovery.NewStaticDiscovery(serviceMap)

	return &Service{
		config:        config,
		router:        mux.NewRouter(),
		lab:           labInst,
		cacheClient:   cacheClient,
		storageClient: storageClient,
		discovery:     disc,
	}, nil
}

// Start starts the api service
func (s *Service) Start(ctx context.Context) error {
	s.lab.Log().Info("Starting api service")

	s.ctx, s.cancel = context.WithCancel(ctx)

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	go func() {
		sig := <-sigCh
		s.lab.Log().WithField("signal", sig.String()).Info("Received signal, shutting down")
		s.cancel()
	}()

	if err := s.initializeServices(); err != nil {
		return fmt.Errorf("failed to initialize services: %w", err)
	}

	s.setupRoutes()

	s.server = &http.Server{
		Addr:    fmt.Sprintf("%s:%d", s.config.HttpServer.Host, s.config.HttpServer.Port),
		Handler: s.router,
	}

	go func() {
		s.lab.Log().WithField("addr", s.server.Addr).Info("Starting HTTP server")
		if err := s.server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			s.lab.Log().WithError(err).Error("HTTP server error")
			s.cancel()
		}
	}()

	if s.config.EnableGRPCGateway {
		go func() {
			s.lab.Log().Info("Starting gRPC gateway")
			if err := s.StartGateway(ctx); err != nil {
				s.lab.Log().WithError(err).Error("gRPC gateway error")
				s.cancel()
			}
		}()
	}

	<-s.ctx.Done()
	s.lab.Log().Info("Context canceled, cleaning up")

	s.cleanup()

	s.lab.Log().Info("Api service stopped")
	return nil
}

func (s *Service) initializeServices() error {
	srvAddr, err := s.discovery.GetServiceURL("srv")
	if err != nil {
		return fmt.Errorf("failed to discover srv service URL: %w", err)
	}
	s.config.SrvClient.Address = srvAddr

	conn, err := grpc.Dial(srvAddr, grpc.WithInsecure())
	if err != nil {
		return fmt.Errorf("failed to dial srv service at %s: %w", srvAddr, err)
	}
	s.srvConn = conn
	s.srvClient = apipb.NewLabAPIClient(conn)

	return nil
}

func (s *Service) setupRoutes() {
	s.router.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	s.router.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		resp, err := s.srvClient.GetStatus(r.Context(), &emptypb.Empty{})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, resp)
	})

	s.router.HandleFunc("/frontend-config", func(w http.ResponseWriter, r *http.Request) {
		resp, err := s.srvClient.GetFrontendConfig(r.Context(), &emptypb.Empty{})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, resp)
	})

	s.router.HandleFunc("/beacon-slot-data", func(w http.ResponseWriter, r *http.Request) {
		network := r.URL.Query().Get("network")
		slotStr := r.URL.Query().Get("slot")
		slot, _ := strconv.ParseUint(slotStr, 10, 64)
		req := &apipb.GetBeaconSlotDataRequest{
			Network: network,
			Slot:    slot,
		}
		resp, err := s.srvClient.GetBeaconSlotData(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, resp)
	})

	s.router.HandleFunc("/beacon-slot-range", func(w http.ResponseWriter, r *http.Request) {
		network := r.URL.Query().Get("network")
		startStr := r.URL.Query().Get("start")
		endStr := r.URL.Query().Get("end")
		start, _ := strconv.ParseUint(startStr, 10, 64)
		end, _ := strconv.ParseUint(endStr, 10, 64)
		req := &apipb.GetBeaconSlotRangeRequest{
			Network: network,
			Start:   start,
			End:     end,
		}
		resp, err := s.srvClient.GetBeaconSlotRange(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, resp)
	})

	s.router.HandleFunc("/beacon-nodes", func(w http.ResponseWriter, r *http.Request) {
		network := r.URL.Query().Get("network")
		req := &apipb.GetBeaconNodesRequest{
			Network: network,
		}
		resp, err := s.srvClient.GetBeaconNodes(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, resp)
	})

	s.router.HandleFunc("/timing-data", func(w http.ResponseWriter, r *http.Request) {
		network := r.URL.Query().Get("network")
		windowName := r.URL.Query().Get("window_name")
		startStr := r.URL.Query().Get("start")
		endStr := r.URL.Query().Get("end")
		start, _ := strconv.ParseUint(startStr, 10, 64)
		end, _ := strconv.ParseUint(endStr, 10, 64)
		req := &apipb.GetTimingDataRequest{
			Network:    network,
			WindowName: windowName,
			Start:      start,
			End:        end,
		}
		resp, err := s.srvClient.GetTimingData(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, resp)
	})

	s.router.HandleFunc("/size-cdf-data", func(w http.ResponseWriter, r *http.Request) {
		network := r.URL.Query().Get("network")
		startStr := r.URL.Query().Get("start")
		endStr := r.URL.Query().Get("end")
		start, _ := strconv.ParseUint(startStr, 10, 64)
		end, _ := strconv.ParseUint(endStr, 10, 64)
		req := &apipb.GetSizeCDFDataRequest{
			Network: network,
			Start:   start,
			End:     end,
		}
		resp, err := s.srvClient.GetSizeCDFData(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, resp)
	})

	s.router.HandleFunc("/beacon-state-file", func(w http.ResponseWriter, r *http.Request) {
		network := r.URL.Query().Get("network")
		req := &apipb.GetBeaconStateFileRequest{
			Network: network,
		}
		resp, err := s.srvClient.GetBeaconStateFile(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, resp)
	})

	s.router.HandleFunc("/beacon-slot-file", func(w http.ResponseWriter, r *http.Request) {
		network := r.URL.Query().Get("network")
		slotStr := r.URL.Query().Get("slot")
		slot, _ := strconv.ParseUint(slotStr, 10, 64)
		req := &apipb.GetBeaconSlotFileRequest{
			Network: network,
			Slot:    slot,
		}
		resp, err := s.srvClient.GetBeaconSlotFile(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		writeJSON(w, resp)
	})
}

func (s *Service) cleanup() {
	if s.server != nil {
		s.lab.Log().Info("Shutting down HTTP server")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := s.server.Shutdown(ctx); err != nil {
			s.lab.Log().WithError(err).Error("Failed to shut down HTTP server")
		}
	}

	if s.restServer != nil {
		s.lab.Log().Info("Shutting down REST gateway server")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := s.restServer.Shutdown(ctx); err != nil {
			s.lab.Log().WithError(err).Error("Failed to shut down REST gateway server")
		}
	}

	if s.grpcServer != nil {
		s.lab.Log().Info("Stopping gRPC server")
		s.grpcServer.GracefulStop()
	}

	if s.srvConn != nil {
		s.lab.Log().Info("Closing gRPC client connection")
		_ = s.srvConn.Close()
	}
}

func writeJSON(w http.ResponseWriter, v interface{}) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}
