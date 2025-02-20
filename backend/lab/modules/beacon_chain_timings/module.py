"""Beacon chain timings module implementation."""
import asyncio
from datetime import datetime, timezone
import json
from typing import Dict, List, Optional, Tuple, Type
import io

from lab.core import logger
import pandas as pd
import numpy as np
from sqlalchemy import text
from tenacity import retry, stop_after_attempt, wait_exponential

from lab.core.module import Module, ModuleContext
from lab.core import config
from .models import TimingData, SizeCDFData

logger = logger.get_logger()

class DataProcessor:
    """Base class for data processors."""

    def __init__(self, ctx: ModuleContext, name: str):
        """Initialize processor."""
        self.ctx = ctx
        self.name = name
        self.logger = ctx.logger

    async def _get_processor_state(self) -> Dict[str, str]:
        """Get processor state from state manager."""
        try:
            state = await self.ctx.state.get(self.name)
        except KeyError:
            # Initialize state if it doesn't exist
            state = {
                "last_processed": {}  # network/window -> timestamp
            }
            await self.ctx.state.set(self.name, state)
        
        # Ensure state has the correct format
        if not isinstance(state.get("last_processed"), dict):
            state["last_processed"] = {}
        
        return state

    def _get_time_range(self, window: config.TimeWindowConfig) -> Tuple[datetime, datetime]:
        """Get time range for a window."""
        end = datetime.now(timezone.utc)
        start = end + window.get_range_timedelta()
        self.logger.debug("Calculated time range", start=start, end=end)
        return start, end

    async def should_process(self, network: str, window: config.TimeWindowConfig) -> bool:
        """Check if this network/window needs processing."""
        state = await self._get_processor_state()
        now = datetime.now(timezone.utc)
        state_key = f"{network}/{window.file}"

        try:
            # Parse last_processed with timezone
            last_processed = datetime.fromisoformat(
                state["last_processed"].get(state_key, "1970-01-01T00:00:00+00:00")
            )
            if last_processed.tzinfo is None:
                last_processed = last_processed.replace(tzinfo=timezone.utc)
        except ValueError:
            # If timezone parsing fails, assume epoch
            self.logger.warning(f"Invalid timestamp in state for {state_key}, using epoch")
            last_processed = datetime(1970, 1, 1, tzinfo=timezone.utc)

        time_since_last = now - last_processed
        interval = self.ctx.config.get_interval_timedelta()

        if time_since_last >= interval:
            self.logger.debug(f"Time to process {self.name}", 
                          network=network,
                          window=window.file,
                          time_since_last=time_since_last.total_seconds(),
                          interval=interval.total_seconds())
            return True

        self.logger.debug(f"Skipping {self.name}, not enough time passed",
                       network=network,
                       window=window.file,
                       time_since_last=time_since_last.total_seconds(),
                       interval=interval.total_seconds())
        return False

    async def update_state(self, network: str, window: config.TimeWindowConfig) -> None:
        """Update state after successful processing."""
        state = await self._get_processor_state()
        state_key = f"{network}/{window.file}"
        state["last_processed"][state_key] = datetime.now(timezone.utc).isoformat()
        await self.ctx.state.set(self.name, state)
        self.logger.debug(f"Updated state for {self.name}", network=network, window=window.file)

    async def process_network_window(self, network: str, window: config.TimeWindowConfig) -> None:
        """Process a specific network and time window."""
        raise NotImplementedError()

    async def process_all(self) -> None:
        """Process all networks and time windows."""
        self.logger.info(f"Processing {self.name} for all networks and time windows", 
                      networks=self.ctx.config.networks)

        for network in self.ctx.config.networks:
            self.logger.debug(f"Processing {self.name} for network", network=network)
            for window in self.ctx.config.time_windows:
                try:
                    if not await self.should_process(network, window):
                        continue

                    self.logger.info(f"Processing {self.name}", 
                                 network=network, 
                                 window=window.file)
                    
                    await self.process_network_window(network, window)
                    await self.update_state(network, window)
                    
                    self.logger.info(f"Successfully processed {self.name}", 
                                 network=network, 
                                 window=window.file)
                except Exception as e:
                    self.logger.error(
                        f"Processing {self.name} failed",
                        network=network,
                        window=window.file,
                        error=str(e)
                    )
                    continue

class BlockTimingsProcessor(DataProcessor):
    """Processor for block timing data."""

    def __init__(self, ctx: ModuleContext):
        """Initialize processor."""
        super().__init__(ctx, "block_timings")

    async def process_network_window(self, network: str, window: config.TimeWindowConfig) -> None:
        """Process timing data for a network and time window."""
        start, end = self._get_time_range(window)
        start_str = start.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end.strftime('%Y-%m-%d %H:%M:%S')
        step_seconds = int(window.get_step_timedelta().total_seconds())

        self.logger.debug("Processing block timings", 
                       network=network, 
                       window=window.file, 
                       start=start_str, 
                       end=end_str, 
                       step_seconds=step_seconds)

        query = text("""
            WITH time_slots AS (
                SELECT 
                    toStartOfInterval(slot_start_date_time, INTERVAL :step_seconds second) as time_slot,
                    meta_network_name,
                    min(propagation_slot_start_diff) as min_arrival,
                    max(propagation_slot_start_diff) as max_arrival,
                    avg(propagation_slot_start_diff) as avg_arrival,
                    quantile(0.05)(propagation_slot_start_diff) as p05_arrival,
                    quantile(0.50)(propagation_slot_start_diff) as p50_arrival,
                    quantile(0.95)(propagation_slot_start_diff) as p95_arrival,
                    count(*) as total_blocks
                FROM beacon_api_eth_v1_events_block FINAL
                WHERE
                    slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
                    AND meta_network_name = :network
                    AND propagation_slot_start_diff < 6000
                GROUP BY time_slot, meta_network_name
            )
            SELECT
                time_slot as time,
                min_arrival,
                max_arrival,
                avg_arrival,
                p05_arrival,
                p50_arrival,
                p95_arrival,
                total_blocks
            FROM time_slots
            ORDER BY time_slot ASC
        """)

        # Execute query
        result = self.ctx.clickhouse.execute(
            query,
            {
                "step_seconds": step_seconds,
                "start_date": start_str,
                "end_date": end_str,
                "network": network
            }
        )
        rows = result.fetchall()

        # Process results
        data = TimingData(
            timestamps=[int(row[0].timestamp()) for row in rows],
            mins=[float(row[1]) for row in rows],
            maxs=[float(row[2]) for row in rows],
            avgs=[float(row[3]) for row in rows],
            p05s=[float(row[4]) for row in rows],
            p50s=[float(row[5]) for row in rows],
            p95s=[float(row[6]) for row in rows],
            blocks=[int(row[7]) for row in rows]
        )

        # Store results
        key = self.ctx.storage_key("block_timings", network, f"{window.file}.json")
        await self._store_json(key, data.dict())

    async def _store_json(self, key: str, data: Dict) -> None:
        """Store JSON data atomically."""
        self.logger.debug("Storing block timings data", key=key)
        json_data = json.dumps(data).encode()
        await self.ctx.storage.store_atomic(key, io.BytesIO(json_data))
        self.logger.debug("Successfully stored block timings data", key=key)

class SizeCDFProcessor(DataProcessor):
    """Processor for size CDF data."""

    def __init__(self, ctx: ModuleContext):
        """Initialize processor."""
        super().__init__(ctx, "size_cdf")

    async def process_network_window(self, network: str, window: config.TimeWindowConfig) -> None:
        """Process size CDF data for a network and time window."""
        start, end = self._get_time_range(window)
        start_str = start.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end.strftime('%Y-%m-%d %H:%M:%S')

        self.logger.debug("Processing size CDF", 
                       network=network, 
                       window=window.file, 
                       start=start_str,
                       end=end_str)

        # Get blob data
        blob_query = text("""
            SELECT
                slot,
                COUNT(*) * 131072 as total_blob_bytes -- 128KB per blob
            FROM canonical_beacon_blob_sidecar FINAL
            WHERE
                slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
                AND meta_network_name = :network
            GROUP BY slot
        """)
        blob_result = self.ctx.clickhouse.execute(
            blob_query,
            {
                "start_date": start_str,
                "end_date": end_str,
                "network": network
            }
        )
        blob_rows = blob_result.fetchall()
        blob_data = {row[0]: row[1] for row in blob_rows}

        # Get MEV relay data
        self.logger.debug("Querying MEV relay data")
        mev_query = text("""
            SELECT DISTINCT
                slot
            FROM mev_relay_proposer_payload_delivered FINAL
            WHERE
                slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
                AND meta_network_name = :network
        """)
        mev_result = self.ctx.clickhouse.execute(
            mev_query,
            {
                "start_date": start_str,
                "end_date": end_str,
                "network": network
            }
        )
        mev_rows = mev_result.fetchall()
        mev_slots = {row[0] for row in mev_rows}
        self.logger.debug("Found MEV relay data", slots=len(mev_slots))

        # Get block arrival data
        block_arrival_query = text("""
            SELECT 
                slot,
                meta_network_name,
                min(propagation_slot_start_diff) as arrival_time
            FROM beacon_api_eth_v1_events_block FINAL
            WHERE
                slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
                AND meta_network_name = :network
            GROUP BY slot, meta_network_name
        """)
        arrival_result = self.ctx.clickhouse.execute(
            block_arrival_query,
            {
                "start_date": start_str,
                "end_date": end_str,
                "network": network
            }
        )
        arrival_rows = arrival_result.fetchall()
        arrival_df = pd.DataFrame(arrival_rows, columns=['slot', 'meta_network_name', 'arrival_time'])

        # Get block size data
        self.logger.debug("Querying block size data")
        block_size_query = text("""
            SELECT 
                slot,
                meta_network_name,
                proposer_index,
                block_total_bytes_compressed
            FROM canonical_beacon_block FINAL
            WHERE
                slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
                AND meta_network_name = :network
        """)
        size_result = self.ctx.clickhouse.execute(
            block_size_query,
            {
                "start_date": start_str,
                "end_date": end_str,
                "network": network
            }
        )
        size_rows = size_result.fetchall()
        size_df = pd.DataFrame(size_rows, columns=['slot', 'meta_network_name', 'proposer_index', 'block_size'])

        # Get proposer entities
        self.logger.debug("Getting proposer entities")
        proposer_query = text("""
            SELECT 
                `index` as proposer_index,
                entity
            FROM ethseer_validator_entity FINAL
            WHERE meta_network_name = :network
        """)
        proposer_result = self.ctx.clickhouse.execute(proposer_query, {"network": network})
        proposer_rows = proposer_result.fetchall()
        proposer_entities = pd.DataFrame(proposer_rows, columns=['proposer_index', 'entity'])

        # Merge dataframes and only keep slots that exist in size_df (canonical blocks)
        block_data = pd.merge(
            arrival_df, 
            size_df,
            on=['slot', 'meta_network_name'],
            how='right'
        ).dropna()

        # Add blob sizes, MEV flag and entity info
        block_data['total_size'] = block_data.apply(
            lambda row: max(row.block_size + blob_data.get(row.slot, 0), 1),  # Ensure minimum size of 1 byte
            axis=1
        )
        block_data['is_mev'] = block_data.slot.isin(mev_slots)
        block_data = pd.merge(block_data, proposer_entities, on='proposer_index', how='left')
        block_data['is_solo'] = block_data.entity == 'solo_stakers'

        # Bucket sizes into 32KB chunks and get average arrival time per bucket
        block_data['size_bucket'] = (block_data.total_size / (32 * 1024)).round() * 32
        block_data['size_bucket'] = block_data['size_bucket'].apply(lambda x: max(x, 32))  # Minimum bucket of 32KB

        # Calculate averages for all blocks, MEV blocks, non-MEV blocks, and solo staker blocks
        avg_all = block_data.groupby('size_bucket')['arrival_time'].mean().round().reset_index()
        avg_mev = block_data[block_data.is_mev].groupby('size_bucket')['arrival_time'].mean().round().reset_index()
        avg_non_mev = block_data[~block_data.is_mev].groupby('size_bucket')['arrival_time'].mean().round().reset_index()
        avg_solo_mev = block_data[block_data.is_solo & block_data.is_mev].groupby('size_bucket')['arrival_time'].mean().round().reset_index()
        avg_solo_non_mev = block_data[block_data.is_solo & ~block_data.is_mev].groupby('size_bucket')['arrival_time'].mean().round().reset_index()

        # Store results
        data = SizeCDFData(
            sizes_kb=avg_all.size_bucket.tolist(),
            arrival_times_ms={
                "all": avg_all.arrival_time.tolist(),
                "mev": avg_mev.arrival_time.tolist() if not avg_mev.empty else [],
                "non_mev": avg_non_mev.arrival_time.tolist() if not avg_non_mev.empty else [],
                "solo_mev": avg_solo_mev.arrival_time.tolist() if not avg_solo_mev.empty else [],
                "solo_non_mev": avg_solo_non_mev.arrival_time.tolist() if not avg_solo_non_mev.empty else []
            }
        )

        key = self.ctx.storage_key("size_cdf", network, f"{window.file}.json")
        await self._store_json(key, data.dict())

    async def _store_json(self, key: str, data: Dict) -> None:
        """Store JSON data atomically."""
        self.logger.debug("Storing size CDF data", key=key)
        json_data = json.dumps(data).encode()
        await self.ctx.storage.store_atomic(key, io.BytesIO(json_data))
        self.logger.debug("Successfully stored size CDF data", key=key)

class BeaconChainTimingsModule(Module):
    """Beacon chain timings module implementation."""

    def __init__(self, ctx: ModuleContext):
        """Initialize module."""
        super().__init__(ctx)
        self._processors = {
            "block_timings": BlockTimingsProcessor(ctx),
            "size_cdf": SizeCDFProcessor(ctx)
        }
        logger.info("Initialized beacon chain timings module")

    @property
    def name(self) -> str:
        """Get module name."""
        return "beacon_chain_timings"

    async def start(self) -> None:
        """Start the module."""
        logger.info("Starting beacon chain timings module")

        # Start processing tasks
        for name, processor in self._processors.items():
            self._create_task(self._run_processor(name, processor))
            logger.info(f"Started {name} processor")

    async def stop(self) -> None:
        """Stop the module."""
        logger.info("Stopping beacon chain timings module")
        
        # Let base class handle task cleanup
        await super().stop()

    async def _run_processor(self, name: str, processor: DataProcessor) -> None:
        """Run a processor in a loop."""
        logger.info(f"Starting {name} processor loop")
        interval = self.ctx.config.get_interval_timedelta()

        while not self._stop_event.is_set():
            try:
                await processor.process_all()
            except Exception as e:
                logger.error(f"{name} processor failed", error=str(e))

            # Wait for next interval or stop event
            try:
                logger.debug(f"Waiting for next {name} interval", seconds=interval.total_seconds())
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=interval.total_seconds()
                )
            except asyncio.TimeoutError:
                continue 