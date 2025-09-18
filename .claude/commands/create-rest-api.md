# Create REST API Endpoint Command

This command guides you through creating a new REST API endpoint in Lab that follows the established CBT (ClickHouse-Based Transformation) table pattern, transforming data from internal gRPC services to public REST responses.

## Prerequisites

Before starting, ensure you have:
1. **CBT table available**: The ClickHouse CBT table must exist in the vendored xatu-cbt package
2. **Network context**: API endpoints are network-scoped under `/api/v1/{network}/`
3. **Data flow understanding**: Frontend → REST → gRPC → XatuCBT Service → CBT Tables

Check available CBT tables:
```bash
ls vendor/xatu-cbt/clickhouse/*.proto | grep -E "(int_|fct_|dim_)" | sort
```

## Step 1: Gather Endpoint Requirements

Ask the user:
1. **What CBT table(s) will this endpoint query?** (e.g., `int_block_head`, `fct_attestation_correctness_head`)
2. **What is the resource path?** (e.g., `/beacon/slot/{slot}/block/timing`)
3. **What query parameters are needed?** (slot, epoch, validator_index, etc.)
4. **What fields should be exposed in the public API?** (not all CBT fields need to be public)
5. **What caching strategy?** (typical: 30s browser, 45s CDN for recent data)

Claude must then:
1. Check the vendored CBT proto file to understand available fields
2. Identify the CBT query builder function in the vendored code
3. Map CBT fields to appropriate public API fields
4. Determine pagination needs based on expected data volume

Present findings to the user for confirmation.

## Step 2: Define Public API Types

Create or update the public API response types in `backend/pkg/api/v1/proto/public.proto`:

```proto
// [ResourceName]Response is the v1 API response for [resource description]
message [ResourceName]Response {
  repeated [ResourceName] items = 1;
  PaginationMetadata pagination = 2;
  FilterMetadata filters = 3;
}

// [ResourceName] represents [description] for public API consumption
message [ResourceName] {
  // Map from CBT fields to public fields
  // Only expose what clients need
  string field1 = 1;
  int64 field2 = 2;
  
  // Use appropriate types:
  // - Timestamps as ISO 8601 strings (not Unix timestamps)
  // - Enums as strings (not integers)
  // - Complex nested data as structured messages
  
  // Reuse existing message types where possible:
  GeoInfo geo = 3;
  ClientInfo client = 4;
}
```

After updating, regenerate proto:
```bash
cd backend/pkg/api/v1/proto
make generate
```

## Step 3: Implement Service Layer

### Visual Implementation Map
```
backend/pkg/server/internal/service/xatu_cbt/
├── service.go (register method)
└── [cbt_table_name].go (new file for implementation)
     └── List[CbtTableName]() → returns vendored CBT types directly
```

### Create Service Method

Create `backend/pkg/server/internal/service/xatu_cbt/[cbt_table_name].go`:

```go
package xatu_cbt

import (
    "context"
    "fmt"
    
    cbtproto "xatu-cbt/clickhouse"
    "google.golang.org/grpc/metadata"
)

// List[CbtTableName] queries the CBT table and returns vendored proto types.
// NO transformation happens here - that's done at the REST layer.
func (s *Service) List[CbtTableName](
    ctx context.Context,
    req *cbtproto.List[CbtTableName]Request,
) (*cbtproto.List[CbtTableName]Response, error) {
    // 1. Extract network from context metadata
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        return nil, fmt.Errorf("no metadata in context")
    }
    
    networks := md.Get("network")
    if len(networks) == 0 {
        return nil, fmt.Errorf("network not specified in metadata")
    }
    network := networks[0]
    
    // 2. Get database for network
    db, err := s.getDatabase(network)
    if err != nil {
        return nil, fmt.Errorf("failed to get database for network %s: %w", network, err)
    }
    
    // 3. Build query using vendored CBT query builder
    query, queryArgs := cbtproto.BuildList[CbtTableName]Query(req)
    
    // 4. Execute query
    rows, err := db.Query(ctx, query, queryArgs...)
    if err != nil {
        return nil, fmt.Errorf("failed to query [cbt_table]: %w", err)
    }
    defer rows.Close()
    
    // 5. Parse results into vendored CBT types
    var items []*cbtproto.[CbtTableName]
    for rows.Next() {
        item := &cbtproto.[CbtTableName]{}
        if err := rows.ScanStruct(item); err != nil {
            return nil, fmt.Errorf("failed to scan row: %w", err)
        }
        items = append(items, item)
    }
    
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("error iterating rows: %w", err)
    }
    
    // 6. Return vendored types directly (NO transformation)
    return &cbtproto.List[CbtTableName]Response{
        [CbtTableName]s: items,
        NextPageToken: generateNextPageToken(req, len(items)),
    }, nil
}
```

### Register in Service

Update `backend/pkg/server/internal/service/xatu_cbt/service.go`:

```go
// Add to the Service struct methods section
// List[CbtTableName] is now available to the gRPC layer
```

## Step 4: Add gRPC Wrapper with Primary Key Enrichment

Update `backend/pkg/server/internal/grpc/xatu_cbt.go`:

### Basic gRPC Wrapper
```go
import (
    cbtproto "xatu-cbt/clickhouse"
    "connectrpc.com/connect"
)

// List[CbtTableName] wraps the service method for Connect-RPC
func (s *XatuCBT) List[CbtTableName](
    ctx context.Context,
    req *connect.Request[cbtproto.List[CbtTableName]Request],
) (*connect.Response[cbtproto.List[CbtTableName]Response], error) {
    // 1. Extract network from request headers
    network := req.Header().Get("X-Network")
    if network == "" {
        return nil, connect.NewError(connect.CodeInvalidArgument, fmt.Errorf("network header required"))
    }
    
    // 2. Add network to context metadata
    ctx = metadata.AppendToOutgoingContext(ctx, "network", network)
    
    // 3. Call service layer
    resp, err := s.service.List[CbtTableName](ctx, req.Msg)
    if err != nil {
        return nil, connect.NewError(connect.CodeInternal, err)
    }
    
    // 4. Return wrapped response
    return connect.NewResponse(resp), nil
}
```

### Primary Key Enrichment Pattern

For tables with slot-based primary keys (like `slot_start_date_time`), the gRPC layer should calculate and inject the primary key for efficient ClickHouse queries. This avoids full table scans and dramatically improves performance.

**When to use**: When the CBT table has a timestamp primary key that can be calculated from a slot number.

```go
// ListIntBlockFirstSeenByNode with PK enrichment
func (x *XatuCBT) ListIntBlockFirstSeenByNode(
    ctx context.Context,
    req *cbtproto.ListIntBlockFirstSeenByNodeRequest,
) (*cbtproto.ListIntBlockFirstSeenByNodeResponse, error) {
    // Calculate SlotStartDateTime if not already set for more efficient queries
    if req.SlotStartDateTime == nil && req.Slot != nil {
        req.SlotStartDateTime = x.calculateSlotStartDateTime(ctx, req.Slot)
    }
    
    return x.service.ListIntBlockFirstSeenByNode(ctx, req)
}
```

The helper function is reusable for ALL CBT methods that need slot-based timestamps:

```go
// calculateSlotStartDateTime calculates the SlotStartDateTime filter for a given slot filter.
// This enables efficient queries using the primary key in ClickHouse.
func (x *XatuCBT) calculateSlotStartDateTime(
    ctx context.Context,
    slotFilter *cbtproto.UInt32Filter,
) *cbtproto.UInt32Filter {
    // Default fallback filter
    fallback := &cbtproto.UInt32Filter{
        Filter: &cbtproto.UInt32Filter_Gte{Gte: 0},
    }
    
    if slotFilter == nil {
        return fallback
    }
    
    // Extract network from metadata
    md, ok := metadata.FromIncomingContext(ctx)
    if !ok {
        x.log.Debug("No metadata in context, using fallback")
        return fallback
    }
    
    networks := md.Get("network")
    if len(networks) == 0 || x.ethereumClient == nil {
        return fallback
    }
    
    network := networks[0]
    
    // Extract slot number from filter (handles all filter types)
    var slotNumber uint64
    switch filter := slotFilter.Filter.(type) {
    case *cbtproto.UInt32Filter_Eq:
        slotNumber = uint64(filter.Eq)
    case *cbtproto.UInt32Filter_Gte:
        slotNumber = uint64(filter.Gte)
    // ... handle other filter types
    }
    
    if slotNumber == 0 {
        return fallback
    }
    
    // Calculate slot start time using wallclock
    networkObj := x.ethereumClient.GetNetwork(network)
    if networkObj == nil {
        return fallback
    }
    
    wallclock := networkObj.GetWallclock()
    if wallclock == nil {
        return fallback
    }
    
    slot := wallclock.Slots().FromNumber(slotNumber)
    startTime := slot.TimeWindow().Start()
    slotStartTime := uint32(startTime.Unix()) //nolint:gosec // safe for slot times
    
    x.log.WithFields(logrus.Fields{
        "network":       network,
        "slot":          slotNumber,
        "slotStartTime": slotStartTime,
    }).Debug("Calculated slot start time for efficient query")
    
    return &cbtproto.UInt32Filter{
        Filter: &cbtproto.UInt32Filter_Eq{Eq: slotStartTime},
    }
}
```

**Benefits of PK Enrichment**:
- Avoids full table scans in ClickHouse
- Uses primary key index for O(log n) lookups instead of O(n) scans
- Reduces query time from seconds to milliseconds
- Reduces ClickHouse resource usage

**When NOT to use**: 
- When the primary key cannot be calculated from request parameters
- When the table doesn't have a timestamp-based primary key
- When the query needs to scan multiple time ranges

## Step 5: Implement REST Handler with Transformation

### Create Handler File

Create `backend/pkg/api/v1/rest/[resource]_handlers.go`:

```go
package rest

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strconv"
    
    "github.com/gorilla/mux"
    apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
    cbtproto "xatu-cbt/clickhouse"
    "connectrpc.com/connect"
)

// handle[ResourceName] handles GET /api/v1/{network}/[resource/path]
// This is where CBT → Public API transformation happens
func (s *Server) handle[ResourceName](w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    network := vars["network"]
    
    // 1. Validate network
    if err := s.validateNetwork(r.Context(), network); err != nil {
        writeError(w, http.StatusBadRequest, "invalid network: %v", err)
        return
    }
    
    // 2. Parse query parameters and path parameters
    // Example for slot in path:
    slotStr := vars["slot"]
    slot, err := strconv.ParseUint(slotStr, 10, 64)
    if err != nil {
        writeError(w, http.StatusBadRequest, "invalid slot: %v", err)
        return
    }
    
    // 3. Build CBT request
    cbtReq := &cbtproto.List[CbtTableName]Request{
        // Map query params to CBT request fields
        Filters: []*cbtproto.Filter{
            {
                Field:    "slot",
                Operator: cbtproto.FilterOperator_EQUALS,
                Value:    fmt.Sprintf("%d", slot),
            },
        },
        Limit: parseLimit(r, 1000),
        PageToken: r.URL.Query().Get("page_token"),
    }
    
    // 4. Call gRPC service (returns CBT types)
    req := connect.NewRequest(cbtReq)
    req.Header().Set("X-Network", network)
    
    resp, err := s.xatuCBTClient.List[CbtTableName](r.Context(), req)
    if err != nil {
        s.log.WithError(err).Error("failed to query CBT table")
        writeError(w, http.StatusInternalServerError, "failed to fetch data")
        return
    }
    
    // 5. TRANSFORM CBT types → Public API types
    apiResponse := &apiv1.[ResourceName]Response{
        Items: make([]*apiv1.[ResourceName], 0, len(resp.Msg.[CbtTableName]s)),
        Pagination: &apiv1.PaginationMetadata{
            PageSize:      int32(len(resp.Msg.[CbtTableName]s)),
            PageToken:     r.URL.Query().Get("page_token"),
            NextPageToken: resp.Msg.NextPageToken,
        },
        Filters: &apiv1.FilterMetadata{
            Network: network,
            AppliedFilters: extractAppliedFilters(r),
        },
    }
    
    // Transform each CBT item to public API item
    for _, cbtItem := range resp.Msg.[CbtTableName]s {
        apiItem := transformCBTToAPI[ResourceName](cbtItem)
        apiResponse.Items = append(apiResponse.Items, apiItem)
    }
    
    // 6. Set cache headers
    setCacheHeaders(w, 30, 45) // 30s browser, 45s CDN
    
    // 7. Write JSON response
    w.Header().Set("Content-Type", "application/json")
    if err := json.NewEncoder(w).Encode(apiResponse); err != nil {
        s.log.WithError(err).Error("failed to encode response")
    }
}

// transformCBTToAPI[ResourceName] transforms CBT types to public API types
// This is the ONLY place where transformation happens
func transformCBTToAPI[ResourceName](cbt *cbtproto.[CbtTableName]) *apiv1.[ResourceName] {
    return &apiv1.[ResourceName]{
        // Map CBT fields to public API fields
        Field1: cbt.Field1,
        Field2: cbt.Field2,
        
        // Transform timestamps to ISO 8601
        Timestamp: formatTimestamp(cbt.TimestampMs),
        
        // Transform nested structures
        Geo: &apiv1.GeoInfo{
            City:          cbt.GeoCity,
            Country:       cbt.GeoCountry,
            CountryCode:   cbt.GeoCountryCode,
            ContinentCode: cbt.GeoContinentCode,
        },
        
        // Transform enums to strings
        Status: cbt.Status.String(),
    }
}

// Helper functions
func parseLimit(r *http.Request, defaultLimit int) int32 {
    limitStr := r.URL.Query().Get("limit")
    if limitStr == "" {
        return int32(defaultLimit)
    }
    limit, err := strconv.Atoi(limitStr)
    if err != nil || limit <= 0 {
        return int32(defaultLimit)
    }
    if limit > 10000 {
        return 10000
    }
    return int32(limit)
}

func setCacheHeaders(w http.ResponseWriter, browserTTL, cdnTTL int) {
    w.Header().Set("Cache-Control", fmt.Sprintf("public, max-age=%d, s-maxage=%d", browserTTL, cdnTTL))
}

func formatTimestamp(ms int64) string {
    return time.Unix(0, ms*int64(time.Millisecond)).UTC().Format(time.RFC3339)
}
```

## Step 6: Add Route to Router

Update `backend/pkg/api/v1/rest/public_router.go`:

```go
func (s *Server) setupPublicRoutes(r *mux.Router) {
    // Add new route
    r.HandleFunc("/api/v1/{network}/[resource/path]", s.handle[ResourceName]).Methods("GET")
    
    // Example with path parameters:
    // r.HandleFunc("/api/v1/{network}/beacon/slot/{slot}/block/timing", s.handleBeaconBlockTiming).Methods("GET")
    
    // Example with query parameters only:
    // r.HandleFunc("/api/v1/{network}/validators", s.handleValidators).Methods("GET")
}
```

## Step 7: Test the Endpoint

### Create Integration Test

Create `backend/pkg/api/v1/rest/[resource]_handlers_test.go`:

```go
package rest

import (
    "context"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/stretchr/testify/require"
    apiv1 "github.com/ethpandaops/lab/backend/pkg/api/v1/proto"
)

func TestHandle[ResourceName](t *testing.T) {
    // Setup test server
    s := setupTestServer(t)
    
    tests := []struct {
        name           string
        network        string
        path           string
        queryParams    string
        expectedStatus int
        validateResp   func(t *testing.T, resp *apiv1.[ResourceName]Response)
    }{
        {
            name:           "valid request",
            network:        "mainnet",
            path:           "/api/v1/mainnet/[resource/path]",
            queryParams:    "?limit=10",
            expectedStatus: http.StatusOK,
            validateResp: func(t *testing.T, resp *apiv1.[ResourceName]Response) {
                require.NotNil(t, resp)
                require.NotEmpty(t, resp.Items)
                require.NotNil(t, resp.Pagination)
                require.Equal(t, "mainnet", resp.Filters.Network)
            },
        },
        {
            name:           "invalid network",
            network:        "invalid",
            path:           "/api/v1/invalid/[resource/path]",
            expectedStatus: http.StatusBadRequest,
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            req := httptest.NewRequest("GET", tt.path+tt.queryParams, nil)
            w := httptest.NewRecorder()
            
            s.router.ServeHTTP(w, req)
            
            require.Equal(t, tt.expectedStatus, w.Code)
            
            if tt.expectedStatus == http.StatusOK && tt.validateResp != nil {
                var resp apiv1.[ResourceName]Response
                err := json.NewDecoder(w.Body).Decode(&resp)
                require.NoError(t, err)
                tt.validateResp(t, &resp)
            }
        })
    }
}
```

### Manual Testing

Test with curl:
```bash
# Basic request
curl -H "Accept: application/json" \
  "http://localhost:8080/api/v1/mainnet/[resource/path]"

# With query parameters
curl -H "Accept: application/json" \
  "http://localhost:8080/api/v1/mainnet/[resource/path]?limit=10&page_token=xyz"

# With path parameters
curl -H "Accept: application/json" \
  "http://localhost:8080/api/v1/mainnet/beacon/slot/12345/block/timing"
```

## Step 8: Documentation

### Update API Documentation

Create or update `docs/api/[resource].md`:

```markdown
# [Resource Name] API

## Endpoint
`GET /api/v1/{network}/[resource/path]`

## Description
[Describe what this endpoint returns]

## Path Parameters
- `network` (required): Network name (e.g., mainnet, sepolia)
- [Add other path parameters]

## Query Parameters
- `limit`: Maximum number of items to return (default: 1000, max: 10000)
- `page_token`: Token for pagination
- [Add other query parameters with bracket notation for filters]

## Response
```json
{
  "items": [...],
  "pagination": {
    "page_size": 100,
    "page_token": "current",
    "next_page_token": "next"
  },
  "filters": {
    "network": "mainnet",
    "applied_filters": {}
  }
}
```

## Example
```bash
curl "https://lab.ethpandaops.com/api/v1/mainnet/[resource/path]?limit=10"
```
```

## Execution Checklist

- [ ] **Requirements gathered**: CBT table identified, fields mapped, caching strategy defined
- [ ] **Public API types defined**: Added to `public.proto` and regenerated
- [ ] **Service layer implemented**: Created `[cbt_table_name].go` with List method
- [ ] **Service registered**: Method added to service struct
- [ ] **gRPC wrapper added**: Connect-RPC wrapper in `xatu_cbt.go`
- [ ] **REST handler created**: Handler with CBT→API transformation
- [ ] **Route registered**: Added to public router
- [ ] **Integration tests written**: Test coverage for success and error cases
- [ ] **Manual testing completed**: Verified with curl commands
- [ ] **Documentation updated**: API docs with examples

## Implementation Order

Execute tasks in this dependency order:

```
Group A (Parallel):
├── Define public API types (public.proto)
└── Research CBT table structure

Group B (After A):
├── Implement service layer method
└── Register in service

Group C (After B):
├── Add gRPC wrapper
└── Create REST handler with transformation

Group D (After C):
├── Register route
├── Write tests
└── Update documentation
```

## Critical Design Principles

1. **Network Scoping**: All endpoints under `/api/v1/{network}/`
2. **Type Boundaries**: Vendored CBT types stay internal until REST layer
3. **Single Transformation Point**: CBT→API transformation ONLY in REST handlers
4. **Metadata Context**: Network passed via metadata through service layers
5. **Query Builders**: Use vendored CBT query builders, don't write raw SQL
6. **Primary Key Enrichment**: Calculate and inject PKs at gRPC layer for efficient queries
7. **Error Handling**: Graceful degradation, structured error responses
8. **Caching Strategy**: Recent data gets short TTL, historical data gets longer TTL

## Common Patterns

### Filter Query Parameters
Use bracket notation for complex filters:
```
?field[operator]=value
?slot[gte]=1000&slot[lt]=2000
?validator_index[in]=1,2,3
```

### Pagination
Always implement cursor-based pagination:
```go
PageToken:     req.PageToken,
NextPageToken: generateNextPageToken(lastItem),
```

### Time Range Queries
```
?from=2024-01-01T00:00:00Z&to=2024-01-02T00:00:00Z
```

### Network Validation
Always validate network through cartographoor service before querying.

## Troubleshooting

### Issue: Cannot find CBT proto types
**Solution**: Ensure vendor directory is up to date:
```bash
go mod vendor
```

### Issue: Query builder not found
**Solution**: Check vendored CBT package for the exact function name:
```bash
grep -r "BuildList.*Query" vendor/xatu-cbt/
```

### Issue: Network not found in metadata
**Solution**: Ensure REST handler sets X-Network header when calling gRPC

### Issue: Transformation losing data
**Solution**: Review field mapping in transformCBTToAPI function

### Issue: Query performance is slow
**Solution**: Check if the table has a calculable primary key (like slot_start_date_time). If yes, implement PK enrichment at the gRPC layer using `calculateSlotStartDateTime` helper. This can improve query performance from O(n) to O(log n).

## Important Notes

- **Check table primary keys**: Before implementing, check if the CBT table has a timestamp-based PK that can be calculated from request params. If yes, implement PK enrichment at gRPC layer for massive performance gains
- Always handle nil pointers when transforming nested structures
- Use appropriate HTTP status codes (400 for client errors, 500 for server errors)
- Include correlation IDs in error logs for debugging
- Monitor query performance and adjust indexes if needed
- Consider implementing request-level caching for expensive queries