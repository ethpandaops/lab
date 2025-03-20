# Detailed Migration Instructions: Python to Go Microservices

This file provides a thorough, step-by-step migration plan to help you move the existing EthPandaOps Python backend into a Go-based microservices architecture. The goal is to split the current monolith into two Go services:

- **backend** – Contains the existing Python codebase.
- **backend-go** – Contains the new Go codebase.
- **srv** – Contains business logic, scheduling, data processing, and uses Temporal workflows, NATS for events, ClickHouse for analytics, and S3/R2 for storage.
- **api** – Offers client-facing endpoints. Handles caching and responds to NATS events from `srv`. Provides a websocket endpoint for real-time updates. Provides a gRPC endpoint for internal calls from `srv`.


You should be able to load only this Markdown file and the code snippet it references to complete all tasks in order. The size of each task varies. If you believe the task is too large, feel free to split it into smaller tasks, and complete them one by one. 

ONLY COMPLETE ONE TASK AT A TIME. Stop once you've completed the task. UPDATE THE MARKDOWN FILE WITH THE TASK YOU'VE COMPLETED.

---

## 1. Understand the Current Python Codebase

Below are tasks that will help you dissect the Python code and see how data flows. Each task references specific files (look up the file in the codebase for more context if you need it).

### 1.1. Review the Python Modules and Dependencies

- [ ] **Examine `requirements.txt` and `pyproject.toml`**  
  - Identify which dependencies matter for data transformations (e.g., `pandas`, `sqlalchemy`) vs. which are used for I/O (e.g., `boto3`, `aiohttp`).
  - Make a quick note of any library-specific logic that will need a Go equivalent (e.g., S3 usage in Python → AWS Go SDK).

  - Scaffold the go service in basic form.
### 1.2. Determine Data Processing Logic

- [ ] **Analyze `/backend/lab/modules`**  
  - **beacon**: Contains code (e.g., `slot.py`) that processes Ethereum slots.  
  - **beacon_chain_timings**: Gathers block timings, size distributions, etc.  
  - **xatu_public_contributors**: Summaries of user data, countries, etc.  

Check how each module collects data (from `ClickHouse` or S3) and how it transforms this data (pandas or direct SQL).  

### 1.3. Discover Scheduling and Triggers

- [ ] **Examine `runner.py`**  
  - Note that `Runner` sets up modules, starts them, and orchestrates their lifecycle.
  - Modules appear to run in a loop or with timed intervals (`beacon_chain_timings` runs every hour, `xatu_public_contributors` uses a schedule).  

- [ ] **Confirm periodic logic**  
  - For instance, the `SlotProcessor` in `beacon/processors/slot.py` loops to process "head" slots and "backlog" slots. This loop can be turned into a Temporal workflow or separate Go routines.

### 1.4. Separate Business Logic from API Endpoints

- [ ] **Review `__main__.py`**  
  - Notice that it doesn't expose many HTTP endpoints; it runs the system as a single "daemon."
  - In the new architecture, the "daemon" logic becomes part of `srv`, while any "server endpoints" you add in the future will live in `api`.

---

## 2. Design the Go Services

### 2.1. Create the Go Repository Structure

- [x] **Initialize two services**  
  - `srv` – your business logic and scheduled tasks.  
  - `api` – minimal logic, serves gRPC or HTTP requests (plus caching).  

- [x] **Add `/proto`**  
  - Inside `proto`, define `.proto` files describing your new gRPC APIs. For example, you might have:
    ```protobuf
    syntax = "proto3";

    package metrics;

    service MetricsService {
      rpc GetCurrentSlot (GetCurrentSlotRequest) returns (GetCurrentSlotResponse);
      // ...
    }
    ```
  - This is how `api` will request data from `srv`.

### 2.2. Connect to Temporal and NATS in `srv`

- [x] **Temporal setup**  
  - In `srv`, create a `temporal` package or folder with code that initializes a Temporal Client.  
  - For each recurring or multi-step workflow (like slot processing backlog, daily roll-ups), define a corresponding `Workflow` function plus any `Activity` functions needed.

- [x] **Event-driven with Broker (NATS)**  
  - Implemented a broker interface with NATS as the initial implementation.
  - Publish events to broker when data is updated (e.g., "slot XYZ processed").  
  - `api` can subscribe to these events to invalidate or refresh caches.

### 2.3. Reproduce S3, ClickHouse, and Logging

- [x] **Replicate Python's S3 usage**  
  - Look at `backend/lab/core/storage.py` for the atomic `store_atomic` method.  
  - Reimplement the same "write to a temp file, then rename" pattern or rely on concurrency-safe writes in S3 if you prefer a simpler approach with the AWS Go SDK.

- [x] **Reimplement ClickHouse queries**  
  - For example, Python code in `clickhouse.py` uses `sqlalchemy`.  
  - Decide on a Go library for ClickHouse (e.g., `github.com/ClickHouse/clickhouse-go`).  
  - Migrate relevant SQL queries from the Python code (like those in the `SlotProcessor` or the `SizeCDFProcessor`).

- [x] **Logging**  
  - Python uses a custom logger in `logger.py`.  
  - In Go, plan for a structured logger (e.g., `zap` or `logrus`) that can attach fields.

### 2.4. Implement the `api` Service

- [x] **Expose gRPC or REST**  
  - Let `api` handle inbound client requests, calling `srv` over gRPC.  
  - If needed, create an in-memory or Redis-based cache to store frequently requested results.  
  - Subscribe to NATS "updates" to know when data changes.

---

## 3. Mapping Python Modules to Temporal Workflows

### 3.1. Beacon Module & Slot Processing

- [ ] **Identify which code is purely scheduling**  
  - The `SlotProcessor` in `beacon/processors/slot.py` has loops for forward slots, backward backlog, etc.  
  - Convert those loops into a Temporal workflow with steps that run the same queries or store the same data to S3.

- [ ] **Use activities for external I/O**  
  - E.g., an activity that queries ClickHouse, returns results, then the workflow can decide how to store or transform them.

### 3.2. Timings Module & Summaries

- [ ] **Look at `beacon_chain_timings/module.py`**  
  - Each "processor" (e.g., `BlockTimingsProcessor`) can be ported to Go code that runs a job at an interval.  
  - Possibly use a single workflow that spawns multiple tasks in parallel for each "processor".

- [ ] **Call S3 or store to ClickHouse**  
  - Reference `transform_slot_data_for_storage` logic if needed.

### 3.3. Xatu Public Contributors

- [ ] **Port the logic that aggregates users, countries, etc.**  
  - The Python code does queries via `sqlalchemy` → re-check them in Go.  
  - Output is stored as JSON in S3. That pattern can remain or shift to a database table if that's simpler.

---

## 4. Implementation Details in Go

### 4.1. Defining Protos

- [ ] **Create `/proto/metrics.proto`** (for example)  
  ```protobuf
  syntax = "proto3";

  package metrics;

  message GetCurrentSlotRequest {}
  message GetCurrentSlotResponse {
    int64 slot = 1;
  }

  service MetricsService {
    rpc GetCurrentSlot (GetCurrentSlotRequest) returns (GetCurrentSlotResponse);
  }
  ```

  Later, you'll generate Go code with protoc.

### 4.2. Writing the srv Microservice

- [ ] **Start a main.go in /srv:**
  - Initialize Temporal client.
  - Register workflows, activities.
  - Subscribe to NATS if you want to get external triggers (e.g., a "wake up" message).
  - Possibly include a small gRPC server to serve internal calls from api → srv.

### 4.3. Writing the api Microservice

- [ ] **In /api, create a minimal service**
  - Connect to your srv service over gRPC.
  - Provide an HTTP or gRPC gateway for external clients.
  - If using in-memory caching, store results from srv calls in a map. If using Redis, connect to it and store ephemeral data.
  - Handle NATS subscriptions to know when data changes.

## 5. Testing and Validation

### 5.1. Compare Outputs with Python

- [ ] **Create test data**
  - Use smaller sets of "slots" or "timing data" so you can run the Python code in dev mode.
  - Compare Python's final JSON output in S3 vs. your new Go-based output.

### 5.2. Integration Tests

- [ ] **Automate a test that**
  - Runs the srv service, triggers slot processing.
  - Runs the api service.
  - Queries "get current slot" or "get xatu summary" to confirm the data matches the Python version.

## 6. Final Steps and Rollout

### 6.1. Phase out Python Modules

- [ ] **Gradually disable modules in runner.py** (like BeaconModule) once the Go-based srv replicates or supersedes that functionality.

### 6.2. Migrate Config Files

- [ ] **Port config.example.yaml logic to your Go services.**
  - For example, store S3 credentials in environment variables or config files.
  - Let srv read clickhouse config from a new config.yaml or from environment variables.

### 6.3. Production Deployment

- [ ] **Dockerize**
  - Replace the existing backend/Dockerfile with your new srv or api Dockerfiles.
  - Confirm you can run everything in Kubernetes or your chosen environment.

References
Storage and S3: See backend/lab/core/storage.py and how "atomic store" is done in Python.
ClickHouse: See backend/lab/core/clickhouse.py and the actual SQL queries throughout modules/*.
Temporal: Official docs at temporal.io.
NATS: Official docs at nats.io.
Whenever a step references a Python file (like runner.py), open it from the code snippet to confirm details. Each step above gives enough direction to replicate that logic in Go.