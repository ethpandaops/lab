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
const queryLatestBlockDelta = `
WITH latest_block AS (
    SELECT MAX(block_number) as max_block
    FROM {database}.int_address_storage_slot_last_access
),
new_slots AS (
    SELECT count() as count
    FROM {database}.int_address_storage_slot_first_access
    WHERE block_number = (SELECT max_block FROM latest_block)
),
last_access AS (
    SELECT
        count() as total,
        countIf(value = '0x0000000000000000000000000000000000000000000000000000000000000000') as cleared
    FROM {database}.int_address_storage_slot_last_access
    WHERE block_number = (SELECT max_block FROM latest_block)
)
SELECT
    (SELECT max_block FROM latest_block) as block_number,
    (SELECT count FROM new_slots) as new_slots,
    (SELECT cleared FROM last_access) as cleared_slots,
    (SELECT total FROM last_access) - (SELECT count FROM new_slots) as modified_slots
`

// Query to get top contributors for latest block
const queryLatestBlockTopContributors = `
WITH latest_block AS (
    SELECT max(block_number) as block_number
    FROM {database}.int_address_storage_slot_first_access
),
new_slots AS (
    SELECT
        address,
        count() as new_slots
    FROM {database}.int_address_storage_slot_first_access
    WHERE block_number = (SELECT block_number FROM latest_block)
    GROUP BY address
),
cleared_slots AS (
    SELECT
        address,
        countIf(value = '0x0000000000000000000000000000000000000000000000000000000000000000') as cleared_slots,
        count() as modified_slots
    FROM {database}.int_address_storage_slot_last_access
    WHERE block_number = (SELECT block_number FROM latest_block)
    GROUP BY address
)
SELECT
    coalesce(n.address, c.address) as address,
    coalesce(n.new_slots, 0) as new_slots,
    coalesce(c.modified_slots, 0) as modified_slots,
    coalesce(c.cleared_slots, 0) as cleared_slots,
    (coalesce(n.new_slots, 0) - coalesce(c.cleared_slots, 0)) * {bytes_per_slot} as net_bytes
FROM new_slots n
FULL OUTER JOIN cleared_slots c ON n.address = c.address
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
