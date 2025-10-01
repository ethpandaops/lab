package rest

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	configpb "github.com/ethpandaops/lab/backend/pkg/server/proto/config"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type mockConfigClient struct {
	configpb.ConfigServiceClient
	GetExperimentConfigFunc        func(ctx context.Context, in *configpb.GetExperimentConfigRequest, opts ...grpc.CallOption) (*configpb.GetExperimentConfigResponse, error)
	GetNetworkExperimentConfigFunc func(ctx context.Context, in *configpb.GetNetworkExperimentConfigRequest, opts ...grpc.CallOption) (*configpb.GetExperimentConfigResponse, error)
}

func (m *mockConfigClient) GetExperimentConfig(ctx context.Context, in *configpb.GetExperimentConfigRequest, opts ...grpc.CallOption) (*configpb.GetExperimentConfigResponse, error) {
	if m.GetExperimentConfigFunc != nil {
		return m.GetExperimentConfigFunc(ctx, in, opts...)
	}

	return nil, status.Error(codes.Unimplemented, "not implemented")
}

func (m *mockConfigClient) GetNetworkExperimentConfig(ctx context.Context, in *configpb.GetNetworkExperimentConfigRequest, opts ...grpc.CallOption) (*configpb.GetExperimentConfigResponse, error) {
	if m.GetNetworkExperimentConfigFunc != nil {
		return m.GetNetworkExperimentConfigFunc(ctx, in, opts...)
	}

	return nil, status.Error(codes.Unimplemented, "not implemented")
}

func TestHandleNetworkExperimentConfig(t *testing.T) {
	tests := []struct {
		name             string
		network          string
		experimentID     string
		mockResponse     *configpb.GetExperimentConfigResponse
		mockError        error
		expectedStatus   int
		expectedNetwork  string
		validateResponse func(*testing.T, *apiv1.GetExperimentConfigResponse)
	}{
		{
			name:         "Valid network and experiment returns filtered data",
			network:      "mainnet",
			experimentID: "block-production-flow",
			mockResponse: &configpb.GetExperimentConfigResponse{
				Experiment: &configpb.ExperimentConfig{
					Id:      "block-production-flow",
					Enabled: true,
					DataAvailability: map[string]*configpb.ExperimentDataAvailability{
						"mainnet": {
							MinSlot: 123,
							MaxSlot: 456,
						},
					},
				},
			},
			expectedStatus:  http.StatusOK,
			expectedNetwork: "mainnet",
			validateResponse: func(t *testing.T, resp *apiv1.GetExperimentConfigResponse) {
				assert.Equal(t, "block-production-flow", resp.Experiment.Id)
				assert.True(t, resp.Experiment.Enabled)
				assert.Len(t, resp.Experiment.DataAvailability, 1)
				assert.Contains(t, resp.Experiment.DataAvailability, "mainnet")
				assert.Equal(t, uint64(123), resp.Experiment.DataAvailability["mainnet"].MinSlot)
				assert.Equal(t, uint64(456), resp.Experiment.DataAvailability["mainnet"].MaxSlot)
				assert.Nil(t, resp.Experiment.Networks, "Networks field should be nil for network-specific response")
			},
		},
		{
			name:           "Invalid network returns 404",
			network:        "invalid-network",
			experimentID:   "block-production-flow",
			mockError:      status.Error(codes.NotFound, "network invalid-network not configured for experiment block-production-flow"),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "Invalid experiment returns 404",
			network:        "mainnet",
			experimentID:   "invalid-experiment",
			mockError:      status.Error(codes.NotFound, "experiment not found: invalid-experiment"),
			expectedStatus: http.StatusNotFound,
		},
		{
			name:           "Empty network parameter returns 400",
			network:        "",
			experimentID:   "block-production-flow",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Empty experiment ID returns 400",
			network:        "mainnet",
			experimentID:   "",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:         "Data availability only includes requested network",
			network:      "holesky",
			experimentID: "block-production-flow",
			mockResponse: &configpb.GetExperimentConfigResponse{
				Experiment: &configpb.ExperimentConfig{
					Id:      "block-production-flow",
					Enabled: true,
					DataAvailability: map[string]*configpb.ExperimentDataAvailability{
						"holesky": {
							MinSlot: 789,
							MaxSlot: 1012,
						},
					},
				},
			},
			expectedStatus:  http.StatusOK,
			expectedNetwork: "holesky",
			validateResponse: func(t *testing.T, resp *apiv1.GetExperimentConfigResponse) {
				assert.Len(t, resp.Experiment.DataAvailability, 1)
				assert.Contains(t, resp.Experiment.DataAvailability, "holesky")
				assert.NotContains(t, resp.Experiment.DataAvailability, "mainnet")
				assert.Equal(t, uint64(789), resp.Experiment.DataAvailability["holesky"].MinSlot)
				assert.Equal(t, uint64(1012), resp.Experiment.DataAvailability["holesky"].MaxSlot)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := &mockConfigClient{
				GetNetworkExperimentConfigFunc: func(ctx context.Context, in *configpb.GetNetworkExperimentConfigRequest, opts ...grpc.CallOption) (*configpb.GetExperimentConfigResponse, error) {
					if tt.mockError != nil {
						return nil, tt.mockError
					}

					if tt.mockResponse != nil {
						assert.Equal(t, tt.experimentID, in.ExperimentId)
						assert.Equal(t, tt.network, in.Network)

						return tt.mockResponse, nil
					}

					return nil, status.Error(codes.Internal, "test error")
				},
			}

			router := &PublicRouter{
				log:          logrus.NewEntry(logrus.StandardLogger()),
				configClient: mockClient,
			}

			req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/%s/experiments/%s/config", tt.network, tt.experimentID), nil)
			req = mux.SetURLVars(req, map[string]string{
				"network":      tt.network,
				"experimentId": tt.experimentID,
			})
			w := httptest.NewRecorder()

			router.handleNetworkExperimentConfig(w, req)

			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, tt.expectedStatus, resp.StatusCode)

			if tt.expectedStatus == http.StatusOK && tt.validateResponse != nil {
				var apiResp apiv1.GetExperimentConfigResponse
				err := json.NewDecoder(resp.Body).Decode(&apiResp)
				require.NoError(t, err)
				tt.validateResponse(t, &apiResp)
			}
		})
	}
}

func TestHandleExperimentConfig(t *testing.T) {
	tests := []struct {
		name             string
		experimentID     string
		mockResponse     *configpb.GetExperimentConfigResponse
		mockError        error
		expectedStatus   int
		validateResponse func(*testing.T, *apiv1.GetExperimentConfigResponse)
	}{
		{
			name:         "Valid experiment returns all network data",
			experimentID: "block-production-flow",
			mockResponse: &configpb.GetExperimentConfigResponse{
				Experiment: &configpb.ExperimentConfig{
					Id:       "block-production-flow",
					Enabled:  true,
					Networks: []string{"mainnet", "holesky"},
					DataAvailability: map[string]*configpb.ExperimentDataAvailability{
						"mainnet": {
							MinSlot: 123,
							MaxSlot: 456,
						},
						"holesky": {
							MinSlot: 789,
							MaxSlot: 1012,
						},
					},
				},
			},
			expectedStatus: http.StatusOK,
			validateResponse: func(t *testing.T, resp *apiv1.GetExperimentConfigResponse) {
				assert.Equal(t, "block-production-flow", resp.Experiment.Id)
				assert.True(t, resp.Experiment.Enabled)
				assert.Equal(t, []string{"mainnet", "holesky"}, resp.Experiment.Networks)
				assert.Len(t, resp.Experiment.DataAvailability, 2)
				assert.Contains(t, resp.Experiment.DataAvailability, "mainnet")
				assert.Contains(t, resp.Experiment.DataAvailability, "holesky")
			},
		},
		{
			name:           "Empty experiment ID returns 400",
			experimentID:   "",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "Non-existent experiment returns 404",
			experimentID:   "invalid-experiment",
			mockError:      status.Error(codes.NotFound, "experiment not found"),
			expectedStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mockClient := &mockConfigClient{
				GetExperimentConfigFunc: func(ctx context.Context, in *configpb.GetExperimentConfigRequest, opts ...grpc.CallOption) (*configpb.GetExperimentConfigResponse, error) {
					if tt.mockError != nil {
						return nil, tt.mockError
					}

					if tt.mockResponse != nil {
						assert.Equal(t, tt.experimentID, in.ExperimentId)

						return tt.mockResponse, nil
					}

					return nil, status.Error(codes.Internal, "test error")
				},
			}

			router := &PublicRouter{
				log:          logrus.NewEntry(logrus.StandardLogger()),
				configClient: mockClient,
			}

			req := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/api/v1/experiments/%s/config", tt.experimentID), nil)
			req = mux.SetURLVars(req, map[string]string{
				"experimentId": tt.experimentID,
			})
			w := httptest.NewRecorder()

			router.handleExperimentConfig(w, req)

			resp := w.Result()
			defer resp.Body.Close()

			assert.Equal(t, tt.expectedStatus, resp.StatusCode)

			if tt.expectedStatus == http.StatusOK && tt.validateResponse != nil {
				var apiResp apiv1.GetExperimentConfigResponse
				err := json.NewDecoder(resp.Body).Decode(&apiResp)
				require.NoError(t, err)
				tt.validateResponse(t, &apiResp)
			}
		})
	}
}
