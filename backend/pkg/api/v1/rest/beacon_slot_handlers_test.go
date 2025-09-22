package rest

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
	"github.com/ethpandaops/lab/backend/pkg/server/proto/xatu_cbt/mock"
	cbtproto "github.com/ethpandaops/xatu-cbt/pkg/proto/clickhouse"
	"github.com/gorilla/mux"
	"github.com/sirupsen/logrus"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

func TestHandleBeaconBlockTiming(t *testing.T) {
	tests := []struct {
		name           string
		network        string
		slot           string
		queryParams    map[string]string
		mockResponse   *cbtproto.ListFctBlockFirstSeenByNodeResponse
		mockError      error
		expectedStatus int
		validateBody   func(t *testing.T, body []byte)
	}{
		{
			name:    "successful request",
			network: "mainnet",
			slot:    "123456",
			mockResponse: &cbtproto.ListFctBlockFirstSeenByNodeResponse{
				FctBlockFirstSeenByNode: []*cbtproto.FctBlockFirstSeenByNode{
					{
						NodeId:                     "node1",
						Username:                   "user1",
						SeenSlotStartDiff:          500,
						MetaClientGeoCity:          "London",
						MetaClientGeoCountry:       "United Kingdom",
						MetaClientGeoCountryCode:   "GB",
						MetaClientGeoContinentCode: "EU",
						MetaClientName:             "lighthouse",
						MetaClientVersion:          "v4.5.0",
						MetaClientImplementation:   "lighthouse",
					},
					{
						NodeId:                     "node2",
						Username:                   "user2",
						SeenSlotStartDiff:          750,
						MetaClientGeoCity:          "New York",
						MetaClientGeoCountry:       "United States",
						MetaClientGeoCountryCode:   "US",
						MetaClientGeoContinentCode: "NA",
						MetaClientName:             "prysm",
						MetaClientVersion:          "v4.1.1",
						MetaClientImplementation:   "prysm",
					},
				},
				NextPageToken: "next-page",
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.BlockTimingResponse
				require.NoError(t, json.Unmarshal(body, &resp))

				assert.Len(t, resp.Nodes, 2)
				assert.Equal(t, "node1", resp.Nodes[0].NodeId)
				assert.Equal(t, "user1", resp.Nodes[0].Username)
				assert.Equal(t, uint32(500), resp.Nodes[0].SeenSlotStartDiff)
				assert.Equal(t, "London", resp.Nodes[0].Geo.City)
				assert.Equal(t, "lighthouse", resp.Nodes[0].Client.Name)

				assert.Equal(t, "node2", resp.Nodes[1].NodeId)
				assert.Equal(t, uint32(750), resp.Nodes[1].SeenSlotStartDiff)

				assert.Equal(t, "next-page", resp.Pagination.NextPageToken)
				assert.Equal(t, "mainnet", resp.Filters.Network)
				assert.Equal(t, "123456", resp.Filters.AppliedFilters["slot"])
			},
		},
		{
			name:           "invalid slot",
			network:        "mainnet",
			slot:           "invalid",
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Bad Request", resp.Error)
				assert.Contains(t, resp.Message, "Invalid slot number")
			},
		},
		{
			name:           "missing network",
			network:        "",
			slot:           "123456",
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Bad Request", resp.Error)
				assert.Contains(t, resp.Message, "Network parameter is required")
			},
		},
		{
			name:    "with query filters",
			network: "mainnet",
			slot:    "123456",
			queryParams: map[string]string{
				"node_id":    "test-node",
				"username":   "test-user",
				"page_size":  "50",
				"page_token": "token123",
			},
			mockResponse: &cbtproto.ListFctBlockFirstSeenByNodeResponse{
				FctBlockFirstSeenByNode: []*cbtproto.FctBlockFirstSeenByNode{},
				NextPageToken:           "",
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.BlockTimingResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Len(t, resp.Nodes, 0)
				assert.Equal(t, "test-node", resp.Filters.AppliedFilters["node_id"])
				assert.Equal(t, "test-user", resp.Filters.AppliedFilters["username"])
			},
		},
		{
			name:    "with custom ordering",
			network: "mainnet",
			slot:    "123456",
			queryParams: map[string]string{
				"order_by": "username%20desc",
			},
			mockResponse: &cbtproto.ListFctBlockFirstSeenByNodeResponse{
				FctBlockFirstSeenByNode: []*cbtproto.FctBlockFirstSeenByNode{
					{
						NodeId:                   "node1",
						Username:                 "zulu",
						SeenSlotStartDiff:        900,
						MetaClientName:           "prysm",
						MetaClientVersion:        "v4.1.1",
						MetaClientImplementation: "prysm",
					},
					{
						NodeId:                   "node2",
						Username:                 "alpha",
						SeenSlotStartDiff:        300,
						MetaClientName:           "lighthouse",
						MetaClientVersion:        "v4.5.0",
						MetaClientImplementation: "lighthouse",
					},
				},
				NextPageToken: "",
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.BlockTimingResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Len(t, resp.Nodes, 2)
				// The mock response would represent data already ordered by username desc
				assert.Equal(t, "node1", resp.Nodes[0].NodeId)
				assert.Equal(t, "zulu", resp.Nodes[0].Username)
				assert.Equal(t, "node2", resp.Nodes[1].NodeId)
				assert.Equal(t, "alpha", resp.Nodes[1].Username)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create gomock controller
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			// Create mock client
			mockClient := mock.NewMockXatuCBTClient(ctrl)

			// Set up mock expectations if not an error case
			if tt.mockResponse != nil {
				mockClient.EXPECT().
					ListFctBlockFirstSeenByNode(gomock.Any(), gomock.Any(), gomock.Any()).
					DoAndReturn(func(ctx context.Context, req *cbtproto.ListFctBlockFirstSeenByNodeRequest, opts ...interface{}) (*cbtproto.ListFctBlockFirstSeenByNodeResponse, error) {
						// Verify default values are set correctly
						if tt.queryParams == nil || tt.queryParams["page_size"] == "" {
							assert.Equal(t, int32(10000), req.PageSize, "Default page size should be 10000")
						}
						// Verify ordering - default or custom
						if orderBy, ok := tt.queryParams["order_by"]; ok && orderBy != "" {
							// Handle URL encoding in the test expectation
							expectedOrderBy := strings.ReplaceAll(orderBy, "%20", " ")
							assert.Equal(t, expectedOrderBy, req.OrderBy, "Custom ordering should be preserved")
						} else {
							assert.Equal(t, "seen_slot_start_diff", req.OrderBy, "Default ordering should be by seen_slot_start_diff")
						}
						return tt.mockResponse, tt.mockError
					})
			}

			// Create router
			pr := &PublicRouter{
				log:           logrus.New(),
				xatuCBTClient: mockClient,
			}

			// Create request
			url := "/api/v1/" + tt.network + "/beacon/slot/" + tt.slot + "/block/timing"
			if len(tt.queryParams) > 0 {
				url += "?"
				first := true
				for k, v := range tt.queryParams {
					if !first {
						url += "&"
					}
					url += k + "=" + v
					first = false
				}
			}

			req := httptest.NewRequest("GET", url, nil)
			req = mux.SetURLVars(req, map[string]string{
				"network": tt.network,
				"slot":    tt.slot,
			})

			// Create response recorder
			rr := httptest.NewRecorder()

			// Call handler
			pr.handleBeaconBlockTiming(rr, req)

			// Check status code
			assert.Equal(t, tt.expectedStatus, rr.Code)

			// Validate response body
			if tt.validateBody != nil {
				tt.validateBody(t, rr.Body.Bytes())
			}
		})
	}
}

func TestHandleBeaconBlock(t *testing.T) {
	tests := []struct {
		name           string
		network        string
		slot           string
		queryParams    map[string]string
		mockResponse   *cbtproto.ListIntBlockHeadResponse
		mockError      error
		expectedStatus int
		validateBody   func(t *testing.T, body []byte)
	}{
		{
			name:    "successful request with single block",
			network: "mainnet",
			slot:    "123456",
			mockResponse: &cbtproto.ListIntBlockHeadResponse{
				IntBlockHead: []*cbtproto.IntBlockHead{
					{
						BlockRoot:                    "0xblock1",
						Slot:                         123456,
						Epoch:                        3858,
						ParentRoot:                   "0xparent1",
						StateRoot:                    "0xstate1",
						ProposerIndex:                42,
						BlockVersion:                 "deneb",
						SlotStartDateTime:            1710000000,
						UpdatedDateTime:              1710000012,
						ExecutionPayloadBlockHash:    "0xexec1",
						ExecutionPayloadBlockNumber:  19500000,
						ExecutionPayloadFeeRecipient: "0xfeerecipient",
						ExecutionPayloadStateRoot:    "0xexecstate",
						ExecutionPayloadParentHash:   "0xexecparent",
					},
				},
				NextPageToken: "",
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.BeaconBlockResponse
				require.NoError(t, json.Unmarshal(body, &resp))

				assert.Len(t, resp.Blocks, 1)
				assert.Equal(t, "0xblock1", resp.Blocks[0].BlockRoot)
				assert.Equal(t, "0xparent1", resp.Blocks[0].ParentRoot)
				assert.Equal(t, "0xstate1", resp.Blocks[0].StateRoot)
				assert.Equal(t, uint32(42), resp.Blocks[0].ProposerIndex)
				assert.Equal(t, "deneb", resp.Blocks[0].BlockVersion)
				assert.Equal(t, "0xexec1", resp.Blocks[0].ExecutionBlockHash)
				assert.Equal(t, uint32(19500000), resp.Blocks[0].ExecutionBlockNumber)
				assert.Equal(t, "0xfeerecipient", resp.Blocks[0].ExecutionFeeRecipient)

				assert.Equal(t, "mainnet", resp.Filters.Network)
				assert.Equal(t, "123456", resp.Filters.AppliedFilters["slot"])
			},
		},
		{
			name:           "invalid slot",
			network:        "mainnet",
			slot:           "invalid",
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Bad Request", resp.Error)
				assert.Contains(t, resp.Message, "Invalid slot number")
			},
		},
		{
			name:           "missing network",
			network:        "",
			slot:           "123456",
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.ErrorResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Equal(t, "Bad Request", resp.Error)
				assert.Contains(t, resp.Message, "Network parameter is required")
			},
		},
		{
			name:    "with query filters",
			network: "mainnet",
			slot:    "123456",
			queryParams: map[string]string{
				"block_root":     "0xspecificblock",
				"proposer_index": "100",
				"page_size":      "10",
			},
			mockResponse: &cbtproto.ListIntBlockHeadResponse{
				IntBlockHead:  []*cbtproto.IntBlockHead{},
				NextPageToken: "",
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var resp apiv1.BeaconBlockResponse
				require.NoError(t, json.Unmarshal(body, &resp))
				assert.Len(t, resp.Blocks, 0)
				assert.Equal(t, "0xspecificblock", resp.Filters.AppliedFilters["block_root"])
				assert.Equal(t, "100", resp.Filters.AppliedFilters["proposer_index"])
			},
		},
		{
			name:           "grpc error",
			network:        "mainnet",
			slot:           "123456",
			mockError:      errors.New("database connection failed"),
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
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			// Create mock client
			mockClient := mock.NewMockXatuCBTClient(ctrl)

			// Setup mock expectations
			if tt.mockError == nil && tt.mockResponse != nil {
				mockClient.EXPECT().
					ListIntBlockHead(gomock.Any(), gomock.Any()).
					Return(tt.mockResponse, nil)
			} else if tt.mockError != nil {
				mockClient.EXPECT().
					ListIntBlockHead(gomock.Any(), gomock.Any()).
					Return(nil, tt.mockError)
			}

			// Create router with mock client
			r := &PublicRouter{
				log:           logrus.NewEntry(logrus.New()),
				xatuCBTClient: mockClient,
			}

			// Build URL with query parameters
			url := "/api/v1/" + tt.network + "/beacon/slot/" + tt.slot + "/block"
			if len(tt.queryParams) > 0 {
				params := []string{}
				for k, v := range tt.queryParams {
					params = append(params, k+"="+v)
				}
				url += "?" + strings.Join(params, "&")
			}

			// Create request
			req, err := http.NewRequestWithContext(context.Background(), http.MethodGet, url, nil)
			require.NoError(t, err)

			// Set path variables
			req = mux.SetURLVars(req, map[string]string{
				"network": tt.network,
				"slot":    tt.slot,
			})

			// Create response recorder
			rr := httptest.NewRecorder()

			// Call handler
			r.handleBeaconBlock(rr, req)

			// Validate status code
			assert.Equal(t, tt.expectedStatus, rr.Code)

			// Validate response body
			if tt.validateBody != nil {
				tt.validateBody(t, rr.Body.Bytes())
			}
		})
	}
}

func TestHandleMevRelayBidCount(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockClient := mock.NewMockXatuCBTClient(ctrl)

	router := &PublicRouter{
		log:           logrus.NewEntry(logrus.New()),
		xatuCBTClient: mockClient,
	}

	tests := []struct {
		name           string
		network        string
		slot           string
		queryParams    string
		mockSetup      func()
		expectedStatus int
		validateResp   func(t *testing.T, resp *apiv1.MevRelayBidCountResponse)
	}{
		{
			name:        "valid request - single relay",
			network:     "mainnet",
			slot:        "12345",
			queryParams: "?relay=flashbots",
			mockSetup: func() {
				mockClient.EXPECT().
					ListFctMevBidCountByRelay(
						gomock.Any(),
						gomock.Any(),
					).
					DoAndReturn(func(ctx interface{}, req *cbtproto.ListFctMevBidCountByRelayRequest, opts ...interface{}) (*cbtproto.ListFctMevBidCountByRelayResponse, error) {
						// Verify network metadata
						// Note: In actual usage, ctx would be a context.Context
						// For testing purposes, we verify the request parameters instead

						// Verify request parameters
						require.NotNil(t, req.Slot)
						require.Equal(t, uint32(12345), req.Slot.GetEq())
						require.NotNil(t, req.RelayName)
						require.Equal(t, "flashbots", req.RelayName.GetEq())

						return &cbtproto.ListFctMevBidCountByRelayResponse{
							FctMevBidCountByRelay: []*cbtproto.FctMevBidCountByRelay{
								{
									Slot:              12345,
									Epoch:             385,
									RelayName:         "flashbots",
									BidTotal:          42,
									SlotStartDateTime: 1609459200, // 2021-01-01 00:00:00 UTC
									UpdatedDateTime:   1609462800, // 2021-01-01 01:00:00 UTC
								},
							},
							NextPageToken: "next-token",
						}, nil
					})
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.MevRelayBidCountResponse) {
				require.NotNil(t, resp)
				require.Len(t, resp.Relays, 1)

				relay := resp.Relays[0]
				require.Equal(t, "flashbots", relay.RelayName)
				require.Equal(t, uint32(42), relay.BidCount)

				require.NotNil(t, resp.Pagination)
				require.Equal(t, "next-token", resp.Pagination.NextPageToken)

				require.NotNil(t, resp.Filters)
				require.Equal(t, "mainnet", resp.Filters.Network)
				require.Equal(t, "12345", resp.Filters.AppliedFilters["slot"])
				require.Equal(t, "flashbots", resp.Filters.AppliedFilters["relay"])
			},
		},
		{
			name:        "all relays for slot",
			network:     "mainnet",
			slot:        "12345",
			queryParams: "",
			mockSetup: func() {
				mockClient.EXPECT().
					ListFctMevBidCountByRelay(
						gomock.Any(),
						gomock.Any(),
					).
					Return(&cbtproto.ListFctMevBidCountByRelayResponse{
						FctMevBidCountByRelay: []*cbtproto.FctMevBidCountByRelay{
							{
								Slot:              12345,
								Epoch:             385,
								RelayName:         "flashbots",
								BidTotal:          42,
								SlotStartDateTime: 1609459200,
								UpdatedDateTime:   1609462800,
							},
							{
								Slot:              12345,
								Epoch:             385,
								RelayName:         "bloxroute",
								BidTotal:          35,
								SlotStartDateTime: 1609459200,
								UpdatedDateTime:   1609462800,
							},
						},
					}, nil)
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.MevRelayBidCountResponse) {
				require.NotNil(t, resp)
				require.Len(t, resp.Relays, 2)
				require.Equal(t, "flashbots", resp.Relays[0].RelayName)
				require.Equal(t, uint32(42), resp.Relays[0].BidCount)
				require.Equal(t, "bloxroute", resp.Relays[1].RelayName)
				require.Equal(t, uint32(35), resp.Relays[1].BidCount)
			},
		},
		{
			name:           "invalid slot number",
			network:        "mainnet",
			slot:           "not-a-number",
			queryParams:    "",
			mockSetup:      func() {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:        "gRPC error",
			network:     "mainnet",
			slot:        "12345",
			queryParams: "",
			mockSetup: func() {
				mockClient.EXPECT().
					ListFctMevBidCountByRelay(
						gomock.Any(),
						gomock.Any(),
					).
					Return(nil, errors.New("database error"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name:        "with pagination",
			network:     "mainnet",
			slot:        "12345",
			queryParams: "?page_size=10&page_token=abc&order_by=relay_name%20desc",
			mockSetup: func() {
				mockClient.EXPECT().
					ListFctMevBidCountByRelay(
						gomock.Any(),
						gomock.Any(),
					).
					DoAndReturn(func(ctx interface{}, req *cbtproto.ListFctMevBidCountByRelayRequest, opts ...interface{}) (*cbtproto.ListFctMevBidCountByRelayResponse, error) {
						require.Equal(t, int32(10), req.PageSize)
						require.Equal(t, "abc", req.PageToken)
						require.Equal(t, "relay_name desc", req.OrderBy)

						return &cbtproto.ListFctMevBidCountByRelayResponse{
							FctMevBidCountByRelay: []*cbtproto.FctMevBidCountByRelay{
								{
									Slot:              12345,
									Epoch:             385,
									RelayName:         "ultrasound",
									BidTotal:          15,
									SlotStartDateTime: 1609459200,
									UpdatedDateTime:   1609462800,
								},
							},
							NextPageToken: "def",
						}, nil
					})
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.MevRelayBidCountResponse) {
				require.NotNil(t, resp)
				require.NotNil(t, resp.Pagination)
				require.Equal(t, int32(10), resp.Pagination.PageSize)
				require.Equal(t, "abc", resp.Pagination.PageToken)
				require.Equal(t, "def", resp.Pagination.NextPageToken)
				require.Equal(t, "relay_name desc", resp.Filters.OrderBy)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.mockSetup()

			// Create request
			url := "/api/v1/" + tt.network + "/beacon/slot/" + tt.slot + "/mev/relay" + tt.queryParams
			req := httptest.NewRequest("GET", url, nil)
			w := httptest.NewRecorder()

			// Set up router
			r := mux.NewRouter()
			r.HandleFunc("/api/v1/{network}/beacon/slot/{slot}/mev/relay", router.handleMevRelayBidCount)

			// Serve request
			r.ServeHTTP(w, req)

			// Check status
			require.Equal(t, tt.expectedStatus, w.Code)

			// Validate response if successful
			if tt.expectedStatus == http.StatusOK && tt.validateResp != nil {
				var resp apiv1.MevRelayBidCountResponse
				err := json.NewDecoder(w.Body).Decode(&resp)
				require.NoError(t, err)
				tt.validateResp(t, &resp)
			}
		})
	}
}

func TestHandleBeaconBlobTotal(t *testing.T) {
	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockClient := mock.NewMockXatuCBTClient(ctrl)

	router := &PublicRouter{
		log:           logrus.NewEntry(logrus.New()),
		xatuCBTClient: mockClient,
	}

	tests := []struct {
		name           string
		network        string
		slot           string
		queryParams    string
		mockSetup      func()
		expectedStatus int
		validateResp   func(t *testing.T, resp *apiv1.BlobTotalResponse)
	}{
		{
			name:        "valid request - single block",
			network:     "mainnet",
			slot:        "8000000",
			queryParams: "",
			mockSetup: func() {
				mockClient.EXPECT().
					ListIntBlockBlobCountHead(
						gomock.Any(),
						gomock.Any(),
					).
					DoAndReturn(func(ctx interface{}, req *cbtproto.ListIntBlockBlobCountHeadRequest, opts ...interface{}) (*cbtproto.ListIntBlockBlobCountHeadResponse, error) {
						// Verify request parameters
						require.NotNil(t, req.Slot)
						require.Equal(t, uint32(8000000), req.Slot.GetEq())

						return &cbtproto.ListIntBlockBlobCountHeadResponse{
							IntBlockBlobCountHead: []*cbtproto.IntBlockBlobCountHead{
								{
									Slot:               8000000,
									Epoch:              250000,
									BlockRoot:          "0xabcd1234",
									BlobCount:          6,
									SlotStartDateTime:  1700000000,
									EpochStartDateTime: 1699996800,
									UpdatedDateTime:    1700000100,
								},
							},
							NextPageToken: "",
						}, nil
					})
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.BlobTotalResponse) {
				require.NotNil(t, resp)
				require.Len(t, resp.Blocks, 1)

				require.Equal(t, "0xabcd1234", resp.Blocks[0].BlockRoot)
				require.Equal(t, uint32(6), resp.Blocks[0].BlobCount)

				require.NotNil(t, resp.Filters)
				require.Equal(t, "mainnet", resp.Filters.Network)
				require.Equal(t, "8000000", resp.Filters.AppliedFilters["slot"])
				require.Equal(t, "blob_count DESC", resp.Filters.OrderBy)
			},
		},
		{
			name:        "multiple blocks for same slot (fork)",
			network:     "mainnet",
			slot:        "8000000",
			queryParams: "",
			mockSetup: func() {
				mockClient.EXPECT().
					ListIntBlockBlobCountHead(
						gomock.Any(),
						gomock.Any(),
					).
					Return(&cbtproto.ListIntBlockBlobCountHeadResponse{
						IntBlockBlobCountHead: []*cbtproto.IntBlockBlobCountHead{
							{
								Slot:               8000000,
								Epoch:              250000,
								BlockRoot:          "0xabcd1234",
								BlobCount:          6,
								SlotStartDateTime:  1700000000,
								EpochStartDateTime: 1699996800,
								UpdatedDateTime:    1700000100,
							},
							{
								Slot:               8000000,
								Epoch:              250000,
								BlockRoot:          "0xefgh5678",
								BlobCount:          4,
								SlotStartDateTime:  1700000000,
								EpochStartDateTime: 1699996800,
								UpdatedDateTime:    1700000100,
							},
						},
					}, nil)
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.BlobTotalResponse) {
				require.NotNil(t, resp)
				require.Len(t, resp.Blocks, 2)
				require.Equal(t, "0xabcd1234", resp.Blocks[0].BlockRoot)
				require.Equal(t, uint32(6), resp.Blocks[0].BlobCount)
				require.Equal(t, "0xefgh5678", resp.Blocks[1].BlockRoot)
				require.Equal(t, uint32(4), resp.Blocks[1].BlobCount)
			},
		},
		{
			name:        "filter by block_root",
			network:     "mainnet",
			slot:        "8000000",
			queryParams: "?block_root=0xspecific",
			mockSetup: func() {
				mockClient.EXPECT().
					ListIntBlockBlobCountHead(
						gomock.Any(),
						gomock.Any(),
					).
					DoAndReturn(func(ctx interface{}, req *cbtproto.ListIntBlockBlobCountHeadRequest, opts ...interface{}) (*cbtproto.ListIntBlockBlobCountHeadResponse, error) {
						require.NotNil(t, req.BlockRoot)
						require.Equal(t, "0xspecific", req.BlockRoot.GetEq())

						return &cbtproto.ListIntBlockBlobCountHeadResponse{
							IntBlockBlobCountHead: []*cbtproto.IntBlockBlobCountHead{
								{
									Slot:               8000000,
									Epoch:              250000,
									BlockRoot:          "0xspecific",
									BlobCount:          3,
									SlotStartDateTime:  1700000000,
									EpochStartDateTime: 1699996800,
									UpdatedDateTime:    1700000100,
								},
							},
						}, nil
					})
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.BlobTotalResponse) {
				require.NotNil(t, resp)
				require.Len(t, resp.Blocks, 1)
				require.Equal(t, "0xspecific", resp.Blocks[0].BlockRoot)
				require.Equal(t, "0xspecific", resp.Filters.AppliedFilters["block_root"])
			},
		},
		{
			name:           "invalid slot number",
			network:        "mainnet",
			slot:           "invalid",
			queryParams:    "",
			mockSetup:      func() {},
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:        "gRPC error",
			network:     "mainnet",
			slot:        "8000000",
			queryParams: "",
			mockSetup: func() {
				mockClient.EXPECT().
					ListIntBlockBlobCountHead(
						gomock.Any(),
						gomock.Any(),
					).
					Return(nil, errors.New("database error"))
			},
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name:        "with pagination",
			network:     "mainnet",
			slot:        "8000000",
			queryParams: "?page_size=5&page_token=token123",
			mockSetup: func() {
				mockClient.EXPECT().
					ListIntBlockBlobCountHead(
						gomock.Any(),
						gomock.Any(),
					).
					DoAndReturn(func(ctx interface{}, req *cbtproto.ListIntBlockBlobCountHeadRequest, opts ...interface{}) (*cbtproto.ListIntBlockBlobCountHeadResponse, error) {
						require.Equal(t, int32(5), req.PageSize)
						require.Equal(t, "token123", req.PageToken)

						return &cbtproto.ListIntBlockBlobCountHeadResponse{
							IntBlockBlobCountHead: []*cbtproto.IntBlockBlobCountHead{
								{
									Slot:               8000000,
									Epoch:              250000,
									BlockRoot:          "0xpage2",
									BlobCount:          2,
									SlotStartDateTime:  1700000000,
									EpochStartDateTime: 1699996800,
									UpdatedDateTime:    1700000100,
								},
							},
							NextPageToken: "token456",
						}, nil
					})
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.BlobTotalResponse) {
				require.NotNil(t, resp)
				require.Len(t, resp.Blocks, 1)
			},
		},
		{
			name:        "empty response",
			network:     "mainnet",
			slot:        "1", // Pre-Deneb slot
			queryParams: "",
			mockSetup: func() {
				mockClient.EXPECT().
					ListIntBlockBlobCountHead(
						gomock.Any(),
						gomock.Any(),
					).
					Return(&cbtproto.ListIntBlockBlobCountHeadResponse{
						IntBlockBlobCountHead: []*cbtproto.IntBlockBlobCountHead{},
					}, nil)
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.BlobTotalResponse) {
				require.NotNil(t, resp)
				require.Len(t, resp.Blocks, 0)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tt.mockSetup()

			// Create request
			url := "/api/v1/" + tt.network + "/beacon/slot/" + tt.slot + "/blob/total" + tt.queryParams
			req := httptest.NewRequest("GET", url, nil)
			w := httptest.NewRecorder()

			// Set up router
			r := mux.NewRouter()
			r.HandleFunc("/api/v1/{network}/beacon/slot/{slot}/blob/total", router.handleBeaconBlobTotal)

			// Serve request
			r.ServeHTTP(w, req)

			// Check status
			require.Equal(t, tt.expectedStatus, w.Code)

			// Validate response if successful
			if tt.expectedStatus == http.StatusOK && tt.validateResp != nil {
				var resp apiv1.BlobTotalResponse
				err := json.NewDecoder(w.Body).Decode(&resp)
				require.NoError(t, err)
				tt.validateResp(t, &resp)
			}
		})
	}
}

func TestHandleBeaconBlobTiming(t *testing.T) {
	tests := []struct {
		name           string
		network        string
		slot           string
		queryParams    string
		mockResponse   *cbtproto.ListFctBlockBlobFirstSeenByNodeResponse
		mockError      error
		expectedStatus int
		validateResp   func(t *testing.T, resp *apiv1.BlobTimingResponse)
	}{
		{
			name:    "valid request with multiple nodes",
			network: "mainnet",
			slot:    "12345",
			mockResponse: &cbtproto.ListFctBlockBlobFirstSeenByNodeResponse{
				FctBlockBlobFirstSeenByNode: []*cbtproto.FctBlockBlobFirstSeenByNode{
					{
						NodeId:                     "node1",
						Username:                   "user1",
						SeenSlotStartDiff:          450,
						BlobIndex:                  0,
						BlockRoot:                  "0xabc123",
						MetaClientGeoCity:          "London",
						MetaClientGeoCountry:       "United Kingdom",
						MetaClientGeoCountryCode:   "GB",
						MetaClientGeoContinentCode: "EU",
						MetaClientName:             "lighthouse",
						MetaClientVersion:          "v4.5.0",
						MetaClientImplementation:   "lighthouse",
					},
					{
						NodeId:                     "node2",
						Username:                   "user2",
						SeenSlotStartDiff:          550,
						BlobIndex:                  1,
						BlockRoot:                  "0xabc123",
						MetaClientGeoCity:          "New York",
						MetaClientGeoCountry:       "United States",
						MetaClientGeoCountryCode:   "US",
						MetaClientGeoContinentCode: "NA",
						MetaClientName:             "prysm",
						MetaClientVersion:          "v4.1.1",
						MetaClientImplementation:   "prysm",
					},
				},
				NextPageToken: "next-page",
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.BlobTimingResponse) {
				require.NotNil(t, resp)
				require.Len(t, resp.Nodes, 2)

				// Check first node
				assert.Equal(t, "node1", resp.Nodes[0].NodeId)
				assert.Equal(t, "user1", resp.Nodes[0].Username)
				assert.Equal(t, uint32(450), resp.Nodes[0].SeenSlotStartDiff)
				assert.Equal(t, uint32(0), resp.Nodes[0].BlobIndex)
				assert.Equal(t, "0xabc123", resp.Nodes[0].BlockRoot)
				assert.Equal(t, "London", resp.Nodes[0].Geo.City)
				assert.Equal(t, "lighthouse", resp.Nodes[0].Client.Name)

				// Check second node
				assert.Equal(t, "node2", resp.Nodes[1].NodeId)
				assert.Equal(t, uint32(550), resp.Nodes[1].SeenSlotStartDiff)
				assert.Equal(t, uint32(1), resp.Nodes[1].BlobIndex)

				// Check pagination
				assert.Equal(t, "next-page", resp.Pagination.NextPageToken)

				// Check filters
				assert.Equal(t, "mainnet", resp.Filters.Network)
				assert.Equal(t, "12345", resp.Filters.AppliedFilters["slot"])
			},
		},
		{
			name:        "valid request with filters",
			network:     "mainnet",
			slot:        "12345",
			queryParams: "?blob_index=2&node_id=specific-node",
			mockResponse: &cbtproto.ListFctBlockBlobFirstSeenByNodeResponse{
				FctBlockBlobFirstSeenByNode: []*cbtproto.FctBlockBlobFirstSeenByNode{
					{
						NodeId:                     "specific-node",
						Username:                   "user1",
						SeenSlotStartDiff:          600,
						BlobIndex:                  2,
						BlockRoot:                  "0xdef456",
						MetaClientGeoCity:          "Tokyo",
						MetaClientGeoCountry:       "Japan",
						MetaClientGeoCountryCode:   "JP",
						MetaClientGeoContinentCode: "AS",
						MetaClientName:             "teku",
						MetaClientVersion:          "v23.10.0",
						MetaClientImplementation:   "teku",
					},
				},
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.BlobTimingResponse) {
				require.NotNil(t, resp)
				require.Len(t, resp.Nodes, 1)
				assert.Equal(t, "specific-node", resp.Nodes[0].NodeId)
				assert.Equal(t, uint32(2), resp.Nodes[0].BlobIndex)
				assert.Equal(t, "0xdef456", resp.Nodes[0].BlockRoot)
				assert.Equal(t, "2", resp.Filters.AppliedFilters["blob_index"])
				assert.Equal(t, "specific-node", resp.Filters.AppliedFilters["node_id"])
			},
		},
		{
			name:        "verifies custom ordering",
			network:     "mainnet",
			slot:        "12345",
			queryParams: "?order_by=username+desc",
			mockResponse: &cbtproto.ListFctBlockBlobFirstSeenByNodeResponse{
				FctBlockBlobFirstSeenByNode: []*cbtproto.FctBlockBlobFirstSeenByNode{},
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.BlobTimingResponse) {
				// The test verifies that custom ordering can be specified
				// The actual ordering verification happens in DoAndReturn above
			},
		},
		{
			name:           "invalid slot",
			network:        "mainnet",
			slot:           "invalid",
			expectedStatus: http.StatusBadRequest,
		},
		{
			name:           "missing network",
			network:        "",
			slot:           "12345",
			expectedStatus: http.StatusMovedPermanently, // Router redirects when network is empty
		},
		{
			name:           "grpc error",
			network:        "mainnet",
			slot:           "12345",
			mockError:      errors.New("grpc error"),
			expectedStatus: http.StatusInternalServerError,
		},
		{
			name:    "empty response",
			network: "mainnet",
			slot:    "12345",
			mockResponse: &cbtproto.ListFctBlockBlobFirstSeenByNodeResponse{
				FctBlockBlobFirstSeenByNode: []*cbtproto.FctBlockBlobFirstSeenByNode{},
			},
			expectedStatus: http.StatusOK,
			validateResp: func(t *testing.T, resp *apiv1.BlobTimingResponse) {
				require.NotNil(t, resp)
				require.Len(t, resp.Nodes, 0)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			// Create mock client
			mockClient := mock.NewMockXatuCBTClient(ctrl)

			// Set up expectations only for valid requests
			if tt.expectedStatus != http.StatusBadRequest {
				if tt.mockError != nil {
					mockClient.EXPECT().
						ListFctBlockBlobFirstSeenByNode(gomock.Any(), gomock.Any(), gomock.Any()).
						Return(nil, tt.mockError)
				} else if tt.mockResponse != nil {
					mockClient.EXPECT().
						ListFctBlockBlobFirstSeenByNode(gomock.Any(), gomock.Any(), gomock.Any()).
						DoAndReturn(func(ctx context.Context, req *cbtproto.ListFctBlockBlobFirstSeenByNodeRequest, opts ...interface{}) (*cbtproto.ListFctBlockBlobFirstSeenByNodeResponse, error) {
							// Verify default values are set correctly
							if tt.queryParams == "" || !strings.Contains(tt.queryParams, "page_size") {
								assert.Equal(t, int32(10000), req.PageSize, "Default page size should be 10000")
							}
							// Verify ordering - default or custom
							if strings.Contains(tt.queryParams, "order_by=username") {
								assert.Equal(t, "username desc", req.OrderBy, "Custom ordering should be preserved")
							} else {
								assert.Equal(t, "seen_slot_start_diff", req.OrderBy, "Default ordering should be by seen_slot_start_diff")
							}
							return tt.mockResponse, nil
						})
				}
			}

			// Create router
			router := &PublicRouter{
				xatuCBTClient: mockClient,
				log:           logrus.New(),
			}

			// Create request
			url := "/api/v1/" + tt.network + "/beacon/slot/" + tt.slot + "/blob/timing" + tt.queryParams
			req := httptest.NewRequest("GET", url, nil)
			w := httptest.NewRecorder()

			// Set up router
			r := mux.NewRouter()
			r.HandleFunc("/api/v1/{network}/beacon/slot/{slot}/blob/timing", router.handleBeaconBlobTiming)

			// Serve request
			r.ServeHTTP(w, req)

			// Check status
			require.Equal(t, tt.expectedStatus, w.Code)

			// Validate response if successful
			if tt.expectedStatus == http.StatusOK && tt.validateResp != nil {
				var resp apiv1.BlobTimingResponse
				err := json.NewDecoder(w.Body).Decode(&resp)
				require.NoError(t, err)
				tt.validateResp(t, &resp)
			}
		})
	}
}

func TestHandleMevBuilderBid(t *testing.T) {
	tests := []struct {
		name           string
		network        string
		slot           string
		queryParams    map[string]string
		mockResponse   *cbtproto.ListFctMevBidValueByBuilderResponse
		mockError      error
		expectedStatus int
		validateBody   func(t *testing.T, body []byte)
	}{
		{
			name:    "successful request",
			network: "mainnet",
			slot:    "8000000",
			mockResponse: &cbtproto.ListFctMevBidValueByBuilderResponse{
				FctMevBidValueByBuilder: []*cbtproto.FctMevBidValueByBuilder{
					{
						Slot:                10239024,
						SlotStartDateTime:   1734307488,
						Epoch:               319969,
						EpochStartDateTime:  1734303888,
						EarliestBidDateTime: 1734307487123,
						RelayNames:          []string{"flashbots", "bloxroute"},
						BlockHash:           "0x1234567890abcdef",
						Value:               "150000000000000000",
					},
					{
						Slot:                10239024,
						SlotStartDateTime:   1734307488,
						Epoch:               319969,
						EpochStartDateTime:  1734303888,
						EarliestBidDateTime: 1734307487456,
						RelayNames:          []string{"ultrasound"},
						BlockHash:           "0xabcdef1234567890",
						Value:               "100000000000000000",
					},
				},
				NextPageToken: "next-page",
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var response apiv1.MevBuilderBidResponse
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Len(t, response.Builders, 2)

				// Check first builder bid
				assert.Equal(t, "0x1234567890abcdef", response.Builders[0].BlockHash)
				assert.Equal(t, "150000000000000000", response.Builders[0].Value)
				assert.Len(t, response.Builders[0].RelayNames, 2)
				assert.Contains(t, response.Builders[0].RelayNames, "flashbots")
				assert.Contains(t, response.Builders[0].RelayNames, "bloxroute")
				assert.NotEmpty(t, response.Builders[0].EarliestBidTime)

				// Check second builder bid
				assert.Equal(t, "0xabcdef1234567890", response.Builders[1].BlockHash)
				assert.Equal(t, "100000000000000000", response.Builders[1].Value)
				assert.Len(t, response.Builders[1].RelayNames, 1)
				assert.Equal(t, "ultrasound", response.Builders[1].RelayNames[0])

				// Check pagination
				assert.Equal(t, "next-page", response.Pagination.NextPageToken)

				// Check filters
				assert.Equal(t, "mainnet", response.Filters.Network)
				assert.Equal(t, "8000000", response.Filters.AppliedFilters["slot"])
			},
		},
		{
			name:           "invalid slot",
			network:        "mainnet",
			slot:           "invalid",
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body []byte) {
				var errResp apiv1.ErrorResponse
				err := json.Unmarshal(body, &errResp)
				require.NoError(t, err)
				assert.Contains(t, errResp.Message, "Invalid slot number")
			},
		},
		{
			name:           "missing network",
			network:        "",
			slot:           "8000000",
			expectedStatus: http.StatusBadRequest,
			validateBody: func(t *testing.T, body []byte) {
				var errResp apiv1.ErrorResponse
				err := json.Unmarshal(body, &errResp)
				require.NoError(t, err)
				assert.Contains(t, errResp.Message, "Network parameter is required")
			},
		},
		{
			name:           "grpc error",
			network:        "mainnet",
			slot:           "8000000",
			mockError:      errors.New("database error"),
			expectedStatus: http.StatusInternalServerError,
			validateBody: func(t *testing.T, body []byte) {
				var errResp apiv1.ErrorResponse
				err := json.Unmarshal(body, &errResp)
				require.NoError(t, err)
				assert.NotEmpty(t, errResp.Message)
			},
		},
		{
			name:    "with query filters",
			network: "mainnet",
			slot:    "8000000",
			queryParams: map[string]string{
				"block_hash": "0x123456",
				"page_size":  "50",
				"order_by":   "value asc",
			},
			mockResponse: &cbtproto.ListFctMevBidValueByBuilderResponse{
				FctMevBidValueByBuilder: []*cbtproto.FctMevBidValueByBuilder{
					{
						BlockHash:           "0x123456",
						Value:               "50000000000000000",
						RelayNames:          []string{"flashbots"},
						EarliestBidDateTime: 1734307487000,
					},
				},
			},
			expectedStatus: http.StatusOK,
			validateBody: func(t *testing.T, body []byte) {
				var response apiv1.MevBuilderBidResponse
				err := json.Unmarshal(body, &response)
				require.NoError(t, err)

				assert.Len(t, response.Builders, 1)
				assert.Equal(t, "0x123456", response.Builders[0].BlockHash)
				assert.Equal(t, "50000000000000000", response.Builders[0].Value)

				// Check filters were applied
				assert.Equal(t, "0x123456", response.Filters.AppliedFilters["block_hash"])
				// order_by is not included in applied filters as it's a pagination parameter
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			defer ctrl.Finish()

			mockClient := mock.NewMockXatuCBTClient(ctrl)

			// Set up mock expectations
			if tt.mockResponse != nil || tt.mockError != nil {
				mockClient.EXPECT().
					ListFctMevBidValueByBuilder(gomock.Any(), gomock.Any()).
					Return(tt.mockResponse, tt.mockError).
					Times(1)
			}

			// Create router
			router := &PublicRouter{
				log:           logrus.NewEntry(logrus.New()),
				xatuCBTClient: mockClient,
			}

			// Create request
			path := "/api/v1/" + tt.network + "/beacon/slot/" + tt.slot + "/mev/builder"
			req := httptest.NewRequest("GET", path, nil)

			// Add query parameters
			q := req.URL.Query()
			for k, v := range tt.queryParams {
				q.Add(k, v)
			}
			req.URL.RawQuery = q.Encode()

			// Set up mux vars
			req = mux.SetURLVars(req, map[string]string{
				"network": tt.network,
				"slot":    tt.slot,
			})

			// Execute request
			w := httptest.NewRecorder()
			router.handleMevBuilderBid(w, req)

			// Validate response
			assert.Equal(t, tt.expectedStatus, w.Code)
			if tt.validateBody != nil {
				tt.validateBody(t, w.Body.Bytes())
			}
		})
	}
}

func TestTransformCBTToAPIMevBuilderBid(t *testing.T) {
	cbtBid := &cbtproto.FctMevBidValueByBuilder{
		BlockHash:           "0xdeadbeef",
		Value:               "200000000000000000",
		RelayNames:          []string{"flashbots", "bloxroute", "ultrasound"},
		EarliestBidDateTime: 1734307487123,
	}

	result := transformCBTToAPIMevBuilderBid(cbtBid)

	assert.NotNil(t, result)
	assert.Equal(t, "0xdeadbeef", result.BlockHash)
	assert.Equal(t, "200000000000000000", result.Value)
	assert.Len(t, result.RelayNames, 3)
	assert.Contains(t, result.RelayNames, "flashbots")
	assert.Contains(t, result.RelayNames, "bloxroute")
	assert.Contains(t, result.RelayNames, "ultrasound")
	assert.NotEmpty(t, result.EarliestBidTime)

	// Verify timestamp format is ISO 8601
	assert.Contains(t, result.EarliestBidTime, "T")
	assert.Contains(t, result.EarliestBidTime, "Z")
}
