package state_analytics

const (
	// Bytes per storage slot (Reth measurement)
	BytesPerSlot = 191

	// Average blocks per time period (12s block time)
	BlocksPerHour    = 300
	BlocksPer24Hours = 7200
	BlocksPer7Days   = 50400
	BlocksPer30Days  = 216000
)

// Query to get latest block state delta
// Uses canonical_execution_storage_diffs table for execution layer data
//
// TODO(performance): This query scans the entire canonical_execution_storage_diffs table (10.6B+ rows)
// which causes severe performance issues (30s+ timeouts). We need to either:
// 1. Create a materialized view that pre-aggregates state changes by block number
// 2. Add indexes on (block_number, from_value, to_value) columns
// 3. Create a separate pre-aggregated table (like int_address_storage_slot_*) but for execution layer
// 4. Use the existing int_address_storage_slot_* tables but add proper execution block number mapping
const queryLatestBlockDelta = `
WITH latest_block AS (
    SELECT MAX(block_number) as max_block
    FROM {database}.canonical_execution_storage_diffs
),
storage_stats AS (
    SELECT
        countIf(from_value = '' OR from_value = '0x0000000000000000000000000000000000000000000000000000000000000000') as new_slots,
        countIf(to_value = '0x0000000000000000000000000000000000000000000000000000000000000000') as cleared_slots,
        countIf(
            (from_value != '' AND from_value != '0x0000000000000000000000000000000000000000000000000000000000000000') AND
            (to_value != '0x0000000000000000000000000000000000000000000000000000000000000000')
        ) as modified_slots
    FROM {database}.canonical_execution_storage_diffs
    WHERE block_number = (SELECT max_block FROM latest_block)
)
SELECT
    (SELECT max_block FROM latest_block) as block_number,
    new_slots,
    cleared_slots,
    modified_slots
FROM storage_stats
`

// Query to get top contributors for latest block
// Uses canonical_execution_storage_diffs table for execution layer data
//
// TODO(performance): This query also suffers from the same performance issue as queryLatestBlockDelta.
// See TODO comments above for solutions. This needs materialized views or pre-aggregated tables.
const queryLatestBlockTopContributors = `
WITH latest_block AS (
    SELECT max(block_number) as block_number
    FROM {database}.canonical_execution_storage_diffs
),
address_stats AS (
    SELECT
        address,
        countIf(from_value = '' OR from_value = '0x0000000000000000000000000000000000000000000000000000000000000000') as new_slots,
        countIf(
            (from_value != '' AND from_value != '0x0000000000000000000000000000000000000000000000000000000000000000') AND
            (to_value != '0x0000000000000000000000000000000000000000000000000000000000000000')
        ) as modified_slots,
        countIf(to_value = '0x0000000000000000000000000000000000000000000000000000000000000000') as cleared_slots
    FROM {database}.canonical_execution_storage_diffs
    WHERE block_number = (SELECT block_number FROM latest_block)
    GROUP BY address
)
SELECT
    address,
    new_slots,
    modified_slots,
    cleared_slots,
    (new_slots - cleared_slots) * {bytes_per_slot} as net_bytes
FROM address_stats
ORDER BY abs(net_bytes) DESC
LIMIT 10
`

// Query to get top state adders for a period
const queryTopStateAdders = `
WITH period_range AS (
    SELECT
        max(block_number) as end_block,
        max(block_number) - {blocks_in_period} as start_block
    FROM {database}.int_address_storage_slot_first_access
)
SELECT
    address,
    count() as slots_added,
    count() * {bytes_per_slot} as bytes_added
FROM {database}.int_address_storage_slot_first_access
WHERE block_number >= (SELECT start_block FROM period_range)
  AND block_number <= (SELECT end_block FROM period_range)
GROUP BY address
ORDER BY slots_added DESC
LIMIT {limit}
`

// Query to get top state removers for a period
const queryTopStateRemovers = `
WITH period_range AS (
    SELECT
        max(block_number) as end_block,
        max(block_number) - {blocks_in_period} as start_block
    FROM {database}.int_address_storage_slot_last_access
)
SELECT
    address,
    countIf(value = '0x0000000000000000000000000000000000000000000000000000000000000000') as slots_cleared,
    countIf(value = '0x0000000000000000000000000000000000000000000000000000000000000000') * {bytes_per_slot} as bytes_freed
FROM {database}.int_address_storage_slot_last_access
WHERE block_number >= (SELECT start_block FROM period_range)
  AND block_number <= (SELECT end_block FROM period_range)
GROUP BY address
HAVING slots_cleared > 0
ORDER BY slots_cleared DESC
LIMIT {limit}
`

// Query to get state growth chart data
const queryStateGrowthChart = `
WITH period_range AS (
    SELECT
        max(block_number) as end_block,
        max(block_number) - {blocks_in_period} as start_block
    FROM {database}.int_address_storage_slot_first_access
),
blocks_in_range AS (
    SELECT DISTINCT block_number
    FROM {database}.int_address_storage_slot_first_access
    WHERE block_number >= (SELECT start_block FROM period_range)
      AND block_number <= (SELECT end_block FROM period_range)
    UNION ALL
    SELECT DISTINCT block_number
    FROM {database}.int_address_storage_slot_last_access
    WHERE block_number >= (SELECT start_block FROM period_range)
      AND block_number <= (SELECT end_block FROM period_range)
),
aggregated_data AS (
    SELECT
        {time_bucket_expression} as time_bucket,
        sum(slots_added) as slots_added,
        sum(slots_cleared) as slots_cleared
    FROM (
        SELECT
            block_number,
            count() as slots_added,
            0 as slots_cleared
        FROM {database}.int_address_storage_slot_first_access
        WHERE block_number >= (SELECT start_block FROM period_range)
        GROUP BY block_number

        UNION ALL

        SELECT
            block_number,
            0 as slots_added,
            countIf(value = '0x0000000000000000000000000000000000000000000000000000000000000000') as slots_cleared
        FROM {database}.int_address_storage_slot_last_access
        WHERE block_number >= (SELECT start_block FROM period_range)
        GROUP BY block_number
    )
    GROUP BY time_bucket
)
SELECT
    time_bucket,
    slots_added,
    slots_cleared,
    slots_added - slots_cleared as net_slots,
    slots_added * {bytes_per_slot} as bytes_added,
    slots_cleared * {bytes_per_slot} as bytes_cleared,
    (slots_added - slots_cleared) * {bytes_per_slot} as net_bytes
FROM aggregated_data
ORDER BY time_bucket ASC
`

// Helper function to get block number from timestamp
const queryBlockNumberFromTimestamp = `
SELECT block_number
FROM {database}.int_address_storage_slot_first_access
WHERE block_number >= 0
ORDER BY abs(
    block_number - (
        {genesis_time} +
        (toUnixTimestamp('{target_timestamp}') - {genesis_time}) / 12
    )
) ASC
LIMIT 1
`

// Query to get state growth categorized by contract (Paradigm Figures 2 & 3)
// Uses canonical_execution_storage_diffs table for execution layer data (NOT beacon chain)
//
// IMPORTANT: This query operates on EXECUTION LAYER blocks only. Do NOT use beacon chain tables
// like int_block_canonical - they have different block number spaces.
//
// Current implementation: Queries last ~7,150 execution blocks (24 hours) to limit scan size.
// Query time: ~2-5 minutes due to scanning 10.6B row table without materialized views.
//
// TODO(performance): Performance can be improved with pre-aggregated materialized views.
// The canonical_execution_storage_diffs table has 10.6B+ rows. Solutions:
//
// Option 1 (RECOMMENDED): Create pre-aggregated materialized views
//   - CREATE MATERIALIZED VIEW mv_daily_state_growth_by_address AS
//     SELECT toDate(...) as day, address, sum(slots_added), sum(slots_cleared)
//     FROM canonical_execution_storage_diffs GROUP BY day, address
//   - Similar views for monthly/yearly aggregations
//   - These views would reduce query time from 60s+ to <1s
//
// Option 2: Add proper indexes
//   - INDEX idx_block_address ON canonical_execution_storage_diffs (block_number, address)
//   - INDEX idx_time_address ON canonical_execution_storage_diffs (updated_date_time, address)
//   - This may help but won't solve the fundamental issue of scanning billions of rows
//
// Option 3: Create a separate aggregated table
//   - Similar to int_address_storage_slot_* but with EXECUTION block numbers instead of beacon slots
//   - Pre-compute daily/monthly aggregations during data ingestion
//   - Store results in dedicated tables: canonical_execution_daily_state_growth, etc.
//
// Until one of these solutions is implemented, this query will timeout on any reasonable time range.
const queryStateGrowthByCategory = `
WITH block_range AS (
    SELECT
        CASE
            WHEN {start_block} = 0 THEN (SELECT min(block_number) FROM {database}.canonical_execution_storage_diffs)
            ELSE {start_block}
        END as start_block,
        CASE
            WHEN {end_block} = 0 THEN (SELECT max(block_number) FROM {database}.canonical_execution_storage_diffs)
            ELSE {end_block}
        END as end_block
),
-- Get storage changes per address per time bucket
storage_changes AS (
    SELECT
        {time_bucket_expression} as time_bucket,
        address,
        -- Count new slots (from_value is empty/zero)
        countIf(from_value = '' OR from_value = '0x0000000000000000000000000000000000000000000000000000000000000000') as slots_added,
        -- Count cleared slots (to_value is zero)
        countIf(to_value = '0x0000000000000000000000000000000000000000000000000000000000000000') as slots_cleared
    FROM {database}.canonical_execution_storage_diffs
    WHERE block_number >= (SELECT start_block FROM block_range)
      AND block_number <= (SELECT end_block FROM block_range)
    GROUP BY time_bucket, address
),
-- Calculate net growth per contract per period
net_growth AS (
    SELECT
        time_bucket,
        address,
        slots_added - slots_cleared as net_slots,
        (slots_added - slots_cleared) * {bytes_per_slot} as net_bytes
    FROM storage_changes
)
SELECT
    time_bucket,
    address,
    net_slots,
    net_bytes
FROM net_growth
WHERE net_bytes != 0  -- Filter out contracts with zero growth
ORDER BY time_bucket ASC, abs(net_bytes) DESC
`

// Query to get contract state composition (for Paradigm diagram)
// Returns all contracts with their current storage slot counts
const queryContractStateComposition = `
WITH latest_block AS (
    SELECT MAX(block_number) as max_block
    FROM {database}.int_address_storage_slot_last_access
),
-- Get slot counts per contract from first_access (all slots ever created)
contract_slots AS (
    SELECT
        address,
        count() as slot_count,
        min(block_number) as first_seen_block
    FROM {database}.int_address_storage_slot_first_access
    GROUP BY address
),
-- Get last activity from last_access table
contract_last_activity AS (
    SELECT
        address,
        max(block_number) as last_active_block
    FROM {database}.int_address_storage_slot_last_access
    GROUP BY address
),
-- Calculate total state bytes
total_state AS (
    SELECT sum(slot_count) * {bytes_per_slot} as total_bytes
    FROM contract_slots
)
SELECT
    cs.address,
    cs.slot_count as storage_slot_count,
    cs.slot_count * {bytes_per_slot} as total_bytes,
    cs.first_seen_block,
    coalesce(la.last_active_block, cs.first_seen_block) as last_active_block,
    (cs.slot_count * {bytes_per_slot}) / (SELECT total_bytes FROM total_state) * 100 as percentage_of_total
FROM contract_slots cs
LEFT JOIN contract_last_activity la ON cs.address = la.address
WHERE cs.slot_count * {bytes_per_slot} >= {min_size_bytes}
ORDER BY cs.slot_count DESC
LIMIT {limit}
`
