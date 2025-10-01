package rest

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	configpb "github.com/ethpandaops/lab/backend/pkg/server/proto/config"
	"github.com/ethpandaops/lab/backend/pkg/server/proto/config/mock"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestHandleNetworkExperimentConfig(t *testing.T) {
	tests := []struct {
		name           string
		network        string
		experimentID   string
		mockSetup      func(mockClient *mock.MockConfigServiceClient)
		expectedStatus int
		validateBody   func(t *testing.T, body []byte)
	}{
		{
			name:         "valid network and experiment returns filtered data",
			network:      "mainnet",
			experimentID: "block-production-flow",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				mockClient.EXPECT().
					GetNetworkExperimentConfig(gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(ctx context.Context, req *configpb.GetNetworkExperimentConfigRequest, opts ...any) (*configpb.GetExperimentConfigResponse, error) {
						// Verify request parameters
						assert.Equal(t, "block-production-flow", req.ExperimentId)
						assert.Equal(t, "mainnet", req.Network)

						return &configpb.GetExperimentConfigResponse{
							Experiment: &configpb.ExperimentConfig{
								Id:       "block-production-flow",
								Enabled:  true,
								Networks: []string{"mainnet", "holesky"},
								DataAvailability: map[string]*configpb.ExperimentDataAvailability{
									"mainnet": {
										AvailableFromTimestamp:  1609459200,
										AvailableUntilTimestamp: 1640995200,
										MinSlot:                 100,
										MaxSlot:                 1000,
										SafeSlot:                950,
										HeadSlot:                1000,
										HasData:                 true,
									},
								},
							},
						}, nil
					})
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.GetExperimentConfigResponse
				require.NoError(t, json.Unmarshal(body, &resp))

				assert.NotNil(t, resp.Experiment)
				assert.Equal(t, "block-production-flow", resp.Experiment.Id)
				assert.True(t, resp.Experiment.Enabled)
				assert.Nil(t, resp.Experiment.Networks, "Networks field should be nil for network-specific responses")

				// Verify data availability only includes requested network
				require.NotNil(t, resp.Experiment.DataAvailability)
				assert.Len(t, resp.Experiment.DataAvailability, 1)
				assert.Contains(t, resp.Experiment.DataAvailability, "mainnet")

				mainnetData := resp.Experiment.DataAvailability["mainnet"]
				assert.Equal(t, int64(1609459200), mainnetData.AvailableFromTimestamp)
				assert.Equal(t, int64(1640995200), mainnetData.AvailableUntilTimestamp)
				assert.Equal(t, uint64(100), mainnetData.MinSlot)
				assert.Equal(t, uint64(1000), mainnetData.MaxSlot)
				assert.Equal(t, uint64(950), mainnetData.SafeSlot)
				assert.Equal(t, uint64(1000), mainnetData.HeadSlot)
				assert.True(t, mainnetData.HasData)
			},
		},
		{
			name:         "invalid network returns 404",
			network:      "nonexistent",
			experimentID: "block-production-flow",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				mockClient.EXPECT().
					GetNetworkExperimentConfig(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, status.Error(codes.NotFound, "network not found"))
			},
			expectedStatus: http.StatusNotFound,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Not Found", resp.Error)
				assert.Contains(t, resp.Message, "network not found")
			},
		},
		{
			name:         "invalid experiment returns 404",
			network:      "mainnet",
			experimentID: "nonexistent-experiment",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				mockClient.EXPECT().
					GetNetworkExperimentConfig(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, status.Error(codes.NotFound, "experiment not found"))
			},
			expectedStatus: http.StatusNotFound,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Not Found", resp.Error)
				assert.Contains(t, resp.Message, "experiment not found")
			},
		},
		{
			name:         "empty network parameter returns 400",
			network:      "",
			experimentID: "block-production-flow",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				// No mock expectation needed as validation should fail before gRPC call
			},
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Bad Request", resp.Error)
				assert.Contains(t, resp.Message, "Network is required")
			},
		},
		{
			name:         "empty experiment parameter returns 400",
			network:      "mainnet",
			experimentID: "",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				// No mock expectation needed as validation should fail before gRPC call
			},
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Bad Request", resp.Error)
				assert.Contains(t, resp.Message, "Experiment id is required")
			},
		},
		{
			name:         "network not in experiment networks returns 404",
			network:      "sepolia",
			experimentID: "block-production-flow",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				mockClient.EXPECT().
					GetNetworkExperimentConfig(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, status.Error(codes.NotFound, "network not configured for this experiment"))
			},
			expectedStatus: http.StatusNotFound,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Not Found", resp.Error)
				assert.Contains(t, resp.Message, "network not configured for this experiment")
			},
		},
		{
			name:         "valid holesky network returns filtered data",
			network:      "holesky",
			experimentID: "block-production-flow",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				mockClient.EXPECT().
					GetNetworkExperimentConfig(gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(ctx context.Context, req *configpb.GetNetworkExperimentConfigRequest, opts ...any) (*configpb.GetExperimentConfigResponse, error) {
						// Verify request parameters
						assert.Equal(t, "block-production-flow", req.ExperimentId)
						assert.Equal(t, "holesky", req.Network)

						return &configpb.GetExperimentConfigResponse{
							Experiment: &configpb.ExperimentConfig{
								Id:       "block-production-flow",
								Enabled:  true,
								Networks: []string{"mainnet", "holesky"},
								DataAvailability: map[string]*configpb.ExperimentDataAvailability{
									"holesky": {
										AvailableFromTimestamp:  1609459300,
										AvailableUntilTimestamp: 1640995300,
										MinSlot:                 200,
										MaxSlot:                 2000,
										SafeSlot:                1950,
										HeadSlot:                2000,
										HasData:                 true,
									},
								},
							},
						}, nil
					})
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.GetExperimentConfigResponse
				require.NoError(t, json.Unmarshal(body, &resp))

				assert.NotNil(t, resp.Experiment)
				assert.Equal(t, "block-production-flow", resp.Experiment.Id)
				assert.True(t, resp.Experiment.Enabled)
				assert.Nil(t, resp.Experiment.Networks, "Networks field should be nil for network-specific responses")

				// Verify data availability only includes requested network
				require.NotNil(t, resp.Experiment.DataAvailability)
				assert.Len(t, resp.Experiment.DataAvailability, 1)
				assert.Contains(t, resp.Experiment.DataAvailability, "holesky")
				assert.NotContains(t, resp.Experiment.DataAvailability, "mainnet", "Should not include other networks")

				holeskyData := resp.Experiment.DataAvailability["holesky"]
				assert.Equal(t, int64(1609459300), holeskyData.AvailableFromTimestamp)
				assert.Equal(t, int64(1640995300), holeskyData.AvailableUntilTimestamp)
				assert.Equal(t, uint64(200), holeskyData.MinSlot)
				assert.Equal(t, uint64(2000), holeskyData.MaxSlot)
				assert.Equal(t, uint64(1950), holeskyData.SafeSlot)
				assert.Equal(t, uint64(2000), holeskyData.HeadSlot)
				assert.True(t, holeskyData.HasData)
			},
		},
		{
			name:         "experiment with no data availability for network",
			network:      "mainnet",
			experimentID: "empty-experiment",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				mockClient.EXPECT().
					GetNetworkExperimentConfig(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(&configpb.GetExperimentConfigResponse{
						Experiment: &configpb.ExperimentConfig{
							Id:               "empty-experiment",
							Enabled:          false,
							Networks:         []string{"mainnet"},
							DataAvailability: map[string]*configpb.ExperimentDataAvailability{},
						},
					}, nil)
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.GetExperimentConfigResponse
				require.NoError(t, json.Unmarshal(body, &resp))

				assert.NotNil(t, resp.Experiment)
				assert.Equal(t, "empty-experiment", resp.Experiment.Id)
				assert.False(t, resp.Experiment.Enabled)
				assert.Nil(t, resp.Experiment.Networks, "Networks field should be nil for network-specific responses")
				assert.Empty(t, resp.Experiment.DataAvailability)
			},
		},
		{
			name:         "grpc internal error returns 500",
			network:      "mainnet",
			experimentID: "block-production-flow",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				mockClient.EXPECT().
					GetNetworkExperimentConfig(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, status.Error(codes.Internal, "database connection failed"))
			},
			expectedStatus: http.StatusInternalServerError,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Internal Server Error", resp.Error)
				assert.Contains(t, resp.Message, "database connection failed")
			},
		},
		{
			name:         "grpc unknown error returns 500",
			network:      "mainnet",
			experimentID: "block-production-flow",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				mockClient.EXPECT().
					GetNetworkExperimentConfig(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(nil, errors.New("unknown error"))
			},
			expectedStatus: http.StatusInternalServerError,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Internal Server Error", resp.Error)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create gomock controller
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			// Create mock client
			mockClient := mock.NewMockConfigServiceClient(ctrl)

			// Set up mock expectations
			if tt.mockSetup != nil {
				tt.mockSetup(mockClient)
			}

			// Create router
			pr := &PublicRouter{
				log:          logrus.New(),
				configClient: mockClient,
			}

			// Create request
			url := "/api/v1/" + tt.network + "/experiments/" + tt.experimentID + "/config"
			req := httptest.NewRequest("GET", url, nil)
			req = mux.SetURLVars(req, map[string]string{
				"network":      tt.network,
				"experimentId": tt.experimentID,
			})

			// Create response recorder
			rr := httptest.NewRecorder()

			// Call handler
			pr.handleNetworkExperimentConfig(rr, req)

			// Check status code
			assert.Equal(t, tt.expectedStatus, rr.Code)

			// Validate response body
			if tt.validateBody != nil {
				tt.validateBody(t, rr.Body.Bytes())
			}
		})
	}
}

func TestHandleExperimentConfig(t *testing.T) {
	tests := []struct {
		name           string
		experimentID   string
		mockSetup      func(mockClient *mock.MockConfigServiceClient)
		expectedStatus int
		validateBody   func(t *testing.T, body []byte)
	}{
		{
			name:         "valid experiment returns all networks data",
			experimentID: "block-production-flow",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				mockClient.EXPECT().
					GetExperimentConfig(gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(ctx context.Context, req *configpb.GetExperimentConfigRequest, opts ...any) (*configpb.GetExperimentConfigResponse, error) {
						// Verify request parameters
						assert.Equal(t, "block-production-flow", req.ExperimentId)

						return &configpb.GetExperimentConfigResponse{
							Experiment: &configpb.ExperimentConfig{
								Id:       "block-production-flow",
								Enabled:  true,
								Networks: []string{"mainnet", "holesky"},
								DataAvailability: map[string]*configpb.ExperimentDataAvailability{
									"mainnet": {
										AvailableFromTimestamp:  1609459200,
										AvailableUntilTimestamp: 1640995200,
										MinSlot:                 100,
										MaxSlot:                 1000,
										SafeSlot:                950,
										HeadSlot:                1000,
										HasData:                 true,
									},
									"holesky": {
										AvailableFromTimestamp:  1609459300,
										AvailableUntilTimestamp: 1640995300,
										MinSlot:                 200,
										MaxSlot:                 2000,
										SafeSlot:                1950,
										HeadSlot:                2000,
										HasData:                 true,
									},
								},
							},
						}, nil
					})
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.GetExperimentConfigResponse
				require.NoError(t, json.Unmarshal(body, &resp))

				assert.NotNil(t, resp.Experiment)
				assert.Equal(t, "block-production-flow", resp.Experiment.Id)
				assert.True(t, resp.Experiment.Enabled)
				assert.Equal(t, []string{"mainnet", "holesky"}, resp.Experiment.Networks)

				// Verify data availability includes all networks
				require.NotNil(t, resp.Experiment.DataAvailability)
				assert.Len(t, resp.Experiment.DataAvailability, 2)
				assert.Contains(t, resp.Experiment.DataAvailability, "mainnet")
				assert.Contains(t, resp.Experiment.DataAvailability, "holesky")
			},
		},
		{
			name:         "empty experiment id returns 400",
			experimentID: "",
			mockSetup: func(mockClient *mock.MockConfigServiceClient) {
				// No mock expectation needed as validation should fail before gRPC call
			},
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Bad Request", resp.Error)
				assert.Contains(t, resp.Message, "Experiment id is required")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create gomock controller
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			// Create mock client
			mockClient := mock.NewMockConfigServiceClient(ctrl)

			// Set up mock expectations
			if tt.mockSetup != nil {
				tt.mockSetup(mockClient)
			}

			// Create router
			pr := &PublicRouter{
				log:          logrus.New(),
				configClient: mockClient,
			}

			// Create request
			url := "/api/v1/experiments/" + tt.experimentID + "/config"
			req := httptest.NewRequest("GET", url, nil)
			req = mux.SetURLVars(req, map[string]string{
				"experimentId": tt.experimentID,
			})

			// Create response recorder
			rr := httptest.NewRecorder()

			// Call handler
			pr.handleExperimentConfig(rr, req)

			// Check status code
			assert.Equal(t, tt.expectedStatus, rr.Code)

			// Validate response body
			if tt.validateBody != nil {
				tt.validateBody(t, rr.Body.Bytes())
			}
		})
	}
}
