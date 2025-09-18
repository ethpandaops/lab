package rest

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
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
		mockResponse   *cbtproto.ListIntBlockFirstSeenByNodeResponse
		mockError      error
		expectedStatus int
		validateBody   func(t *testing.T, body []byte)
	}{
		{
			name:    "successful request",
			network: "mainnet",
			slot:    "123456",
			mockResponse: &cbtproto.ListIntBlockFirstSeenByNodeResponse{
				IntBlockFirstSeenByNode: []*cbtproto.IntBlockFirstSeenByNode{
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
				assert.Equal(t, int64(500), resp.Nodes[0].SeenDiffMs)
				assert.Equal(t, "London", resp.Nodes[0].Geo.City)
				assert.Equal(t, "lighthouse", resp.Nodes[0].Client.Name)

				assert.Equal(t, "node2", resp.Nodes[1].NodeId)
				assert.Equal(t, int64(750), resp.Nodes[1].SeenDiffMs)

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
			mockResponse: &cbtproto.ListIntBlockFirstSeenByNodeResponse{
				IntBlockFirstSeenByNode: []*cbtproto.IntBlockFirstSeenByNode{},
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
					ListIntBlockFirstSeenByNode(gomock.Any(), gomock.Any(), gomock.Any()).
					Return(tt.mockResponse, tt.mockError)
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
