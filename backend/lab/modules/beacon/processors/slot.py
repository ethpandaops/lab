"""Slot processor for Beacon module."""
from ast import Tuple
import asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
import json
import io

from pydantic import BaseModel
from sqlalchemy import text

from lab.core.module import ModuleContext
from lab.ethereum import EthereumNetwork
from lab.core.config import BeaconNetworkConfig
from .base import BaseProcessor

class SlotProcessorState:
    """State for the slot processor."""
    def __init__(self, state: Dict[str, Any]):
        self.target_slot: Optional[int] = state.get("target_slot")
        self.current_slot: Optional[int] = state.get("current_slot")
        self.direction: str = state.get("direction", "forward")  # forward or backward

    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for storage."""
        return {
            "target_slot": self.target_slot,
            "current_slot": self.current_slot,
            "direction": self.direction
        }

class ProposerData(BaseModel):
    """Proposer data model."""
    slot: int
    proposer_pubkey: str
    proposer_validator_index: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "slot": self.slot,
            "proposer_pubkey": self.proposer_pubkey,
            "proposer_validator_index": self.proposer_validator_index
        }

class BlockData(BaseModel):
    """Block data model."""
    slot: int
    slot_start_date_time: datetime
    epoch: int
    epoch_start_date_time: datetime
    block_root: str
    block_version: str
    block_total_bytes: Optional[int]
    block_total_bytes_compressed: Optional[int]
    parent_root: str
    state_root: str
    proposer_index: int
    eth1_data_block_hash: str
    eth1_data_deposit_root: str
    execution_payload_block_hash: str
    execution_payload_block_number: int
    execution_payload_fee_recipient: str
    execution_payload_base_fee_per_gas: Optional[int]
    execution_payload_blob_gas_used: Optional[int]
    execution_payload_excess_blob_gas: Optional[int]
    execution_payload_gas_limit: Optional[int]
    execution_payload_gas_used: Optional[int]
    execution_payload_state_root: str
    execution_payload_parent_hash: str
    execution_payload_transactions_count: Optional[int]
    execution_payload_transactions_total_bytes: Optional[int]
    execution_payload_transactions_total_bytes_compressed: Optional[int]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        data = self.model_dump()
        data['slot_start_date_time'] = self.slot_start_date_time.isoformat()
        data['epoch_start_date_time'] = self.epoch_start_date_time.isoformat()
        return data

class SeenAtSlotTimeData(BaseModel):
    """Seen at slot time data model."""
    slot_time_ms: int
    meta_client_name: str
    meta_client_geo_city: str
    meta_client_geo_country: str
    meta_client_geo_continent_code: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "slot_time_ms": self.slot_time_ms,
            "meta_client_name": self.meta_client_name,
            "meta_client_geo_city": self.meta_client_geo_city,
            "meta_client_geo_country": self.meta_client_geo_country,
            "meta_client_geo_continent_code": self.meta_client_geo_continent_code
        }

class BlobSeenAtSlotTimeData(BaseModel):
    """Blob seen at slot time data model."""
    slot_time_ms: int
    blob_index: int
    meta_client_name: str
    meta_client_geo_city: str
    meta_client_geo_country: str
    meta_client_geo_continent_code: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "slot_time_ms": self.slot_time_ms,
            "blob_index": self.blob_index,
            "meta_client_name": self.meta_client_name,
            "meta_client_geo_city": self.meta_client_geo_city,
            "meta_client_geo_country": self.meta_client_geo_country,
            "meta_client_geo_continent_code": self.meta_client_geo_continent_code
        }

class Node(BaseModel):
    """Node represents a client with its geo data."""
    name: str
    username: str
    geo_city: str
    geo_country: str
    geo_continent_code: str

    @classmethod
    def extract_username(cls, name: str) -> str:
        """Extract username from node name."""
        parts = name.split("/")
        if len(parts) < 2:
            return ""
        
        if "ethpandaops" in name:
            return "ethpandaops"
        
        return parts[1]

    def __init__(self, **data):
        """Initialize node with extracted username."""
        if "username" not in data:
            data["username"] = self.extract_username(data["name"])
        super().__init__(**data)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "username": self.username,
            "geo": {
                "city": self.geo_city,
                "country": self.geo_country,
                "continent": self.geo_continent_code
            }
        }

class AttestationWindow(BaseModel):
    """Represents a window of attestations."""
    start_ms: int  # Start of the window in ms from slot start
    end_ms: int    # End of the window in ms from slot start
    validator_indices: List[int]  # List of validator indices that attested in this window

    def to_dict(self) -> Dict[str, Any]:
        return {
            "start_ms": self.start_ms,
            "end_ms": self.end_ms,
            "validator_indices": self.validator_indices
        }

class OptimizedSlotData(BaseModel):
    """Optimized slot data for storage."""
    slot: int
    network: str
    processed_at: str
    processing_time_ms: int
    
    # Block data
    block: Dict[str, Any]
    proposer: Dict[str, Any]
    entity: Optional[str]
    
    # Nodes that have seen data
    nodes: Dict[str, Node]  # meta_client_name -> Node
    
    # Timing data
    block_seen_times: Dict[str, int]  # meta_client_name -> time_ms
    blob_seen_times: Dict[str, Dict[int, int]]  # meta_client_name -> blob_index -> time_ms
    block_first_seen_p2p_times: Dict[str, int]  # meta_client_name -> time_ms
    blob_first_seen_p2p_times: Dict[str, Dict[int, int]]  # meta_client_name -> blob_index -> time_ms
    
    # Attestation data
    attestation_windows: List[AttestationWindow]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "slot": self.slot,
            "network": self.network,
            "processed_at": self.processed_at,
            "processing_time_ms": self.processing_time_ms,
            "block": self.block,
            "proposer": self.proposer,
            "entity": self.entity,
            "nodes": {k: v.to_dict() for k, v in self.nodes.items()},
            "timings": {
                "block_seen": self.block_seen_times,
                "blob_seen": self.blob_seen_times,
                "block_first_seen_p2p": self.block_first_seen_p2p_times,
                "blob_first_seen_p2p": self.blob_first_seen_p2p_times,
            },
            "attestations": {
                "windows": [w.to_dict() for w in self.attestation_windows]
            }
        }

def transform_slot_data_for_storage(
    slot: int,
    network: str,
    processed_at: str,
    processing_time_ms: int,
    block_data: Dict[str, Any],
    proposer_data: Dict[str, Any],
    maximum_attestation_votes: int,
    entity: Optional[str],
    block_seen_at_slot_time_data: List[SeenAtSlotTimeData],
    blob_seen_at_slot_time_data: List[BlobSeenAtSlotTimeData],
    block_first_seen_in_p2p_slot_time_data: List[SeenAtSlotTimeData],
    blob_first_seen_in_p2p_slot_time_data: List[BlobSeenAtSlotTimeData],
    attestation_votes: Dict[int, int],
) -> OptimizedSlotData:
    """Transform raw slot data into optimized format for storage."""
    # Build nodes dictionary
    nodes: Dict[str, Node] = {}
    
    # Helper to add node
    def add_node(name: str, city: str, country: str, continent: str) -> None:
        if name not in nodes:
            nodes[name] = Node(
                name=name,
                geo_city=city,
                geo_country=country,
                geo_continent_code=continent
            )

    # Process all node data
    for d in block_seen_at_slot_time_data:
        add_node(d.meta_client_name, d.meta_client_geo_city, d.meta_client_geo_country, d.meta_client_geo_continent_code)
    for d in blob_seen_at_slot_time_data:
        add_node(d.meta_client_name, d.meta_client_geo_city, d.meta_client_geo_country, d.meta_client_geo_continent_code)
    for d in block_first_seen_in_p2p_slot_time_data:
        add_node(d.meta_client_name, d.meta_client_geo_city, d.meta_client_geo_country, d.meta_client_geo_continent_code)
    for d in blob_first_seen_in_p2p_slot_time_data:
        add_node(d.meta_client_name, d.meta_client_geo_city, d.meta_client_geo_country, d.meta_client_geo_continent_code)

    # Build timing dictionaries
    block_seen_times = {d.meta_client_name: d.slot_time_ms for d in block_seen_at_slot_time_data}
    block_first_seen_p2p_times = {d.meta_client_name: d.slot_time_ms for d in block_first_seen_in_p2p_slot_time_data}
    
    # Build blob timing dictionaries
    blob_seen_times: Dict[str, Dict[int, int]] = {}
    for d in blob_seen_at_slot_time_data:
        if d.meta_client_name not in blob_seen_times:
            blob_seen_times[d.meta_client_name] = {}
        blob_seen_times[d.meta_client_name][d.blob_index] = d.slot_time_ms

    blob_first_seen_p2p_times: Dict[str, Dict[int, int]] = {}
    for d in blob_first_seen_in_p2p_slot_time_data:
        if d.meta_client_name not in blob_first_seen_p2p_times:
            blob_first_seen_p2p_times[d.meta_client_name] = {}
        blob_first_seen_p2p_times[d.meta_client_name][d.blob_index] = d.slot_time_ms

    # Transform attestation votes into windows
    # Group attestations by time windows (50ms buckets)
    attestation_buckets: Dict[int, List[int]] = {}
    for validator_index, time_ms in attestation_votes.items():
        bucket = time_ms - (time_ms % 50)  # Round down to nearest 50ms
        if bucket not in attestation_buckets:
            attestation_buckets[bucket] = []
        attestation_buckets[bucket].append(validator_index)

    # Create attestation windows
    attestation_windows = []
    for start_ms in sorted(attestation_buckets.keys()):
        window = AttestationWindow(
            start_ms=start_ms,
            end_ms=start_ms + 50,
            validator_indices=sorted(attestation_buckets[start_ms])
        )
        attestation_windows.append(window)

    return OptimizedSlotData(
        slot=slot,
        network=network,
        processed_at=processed_at,
        processing_time_ms=processing_time_ms,
        block=block_data,
        maximum_attestation_votes=maximum_attestation_votes,
        proposer=proposer_data,
        entity=entity,
        nodes=nodes,
        block_seen_times=block_seen_times,
        blob_seen_times=blob_seen_times,
        block_first_seen_p2p_times=block_first_seen_p2p_times,
        blob_first_seen_p2p_times=blob_first_seen_p2p_times,
        attestation_windows=attestation_windows
    )

class SlotProcessor(BaseProcessor):
    """Processor for beacon chain slots."""

    DEFAULT_BACKLOG_DAYS = 3
    DEFAULT_HEAD_LAG_SLOTS = 3
    BACKLOG_SLEEP_MS = 500  # Sleep between backlog slot processing

    def __init__(self, ctx: ModuleContext, network_name: str, network: EthereumNetwork, network_config: BeaconNetworkConfig):
        """Initialize slot processor."""
        super().__init__(ctx, f"slot_{network_name}")
        self.network_name = network_name
        self.network = network
        
        # Get network-specific config
        self.head_lag_slots = network_config.head_lag_slots
        self.backlog_days = network_config.backlog_days
        
        # Tasks
        self._head_task: Optional[asyncio.Task] = None
        self._backlog_task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    async def _get_processor_state(self, direction: str) -> SlotProcessorState:
        """Get processor state from state manager."""
        try:
            state = await self.ctx.state.get(f"{self.name}_{direction}")
        except Exception as e:
            self.logger.debug(f"No existing state found for {direction}, initializing new state: {str(e)}")
            state = {}
        
        if not state:
            # Initialize with current state based on network
            current_slot = self.network.clock.get_current_slot()
            if direction == "forward":
                state = {
                    "target_slot": current_slot,
                    "current_slot": current_slot - self.head_lag_slots - 1,  # Start one behind
                    "direction": direction
                }
            else:  # backward
                state = {
                    "target_slot": max(0, current_slot - (self.backlog_days * 24 * 60 * 60 // self.network.config.seconds_per_slot)),
                    "current_slot": current_slot,
                    "direction": direction
                }
            # Save initial state
            await self.ctx.state.set(f"{self.name}_{direction}", state)
            
        return SlotProcessorState(state)

    async def _save_processor_state(self, state: SlotProcessorState) -> None:
        """Save processor state to state manager."""
        await self.ctx.state.set(f"{self.name}_{state.direction}", state.to_dict())

    def _get_initial_backlog_slot(self) -> int:
        """Calculate initial backlog slot (current - 3 days)."""
        current_slot = self.network.clock.get_current_slot()
        slots_per_day = 24 * 60 * 60 // self.network.config.seconds_per_slot
        return max(0, current_slot - (slots_per_day * self.backlog_days))

    async def process_slot(self, slot: int) -> bool:
        """Process a single slot.
        
        Args:
            slot: Slot number to process
            
        Returns:
            bool: True if processing was successful
        """
        try:
            started_at = datetime.now(timezone.utc)

            self.logger.debug(f"Processing slot {slot} for network {self.network_name}")

            logger = self.logger.getChild(f"slot_{slot}")

            ## Get the block data
            block_data, proposer_data = await asyncio.gather(
                self.get_block_data(slot),
                self.get_proposer_data(slot)
            )
 
            ## Get everything else
            logger.debug("Fetching slot data...")
            try:
                # Run all timing data fetches concurrently
                maximum_attestation_votes, entity, block_seen_at_slot_time_data, blob_seen_at_slot_time_data, block_first_seen_in_p2p_slot_time_data, blob_first_seen_in_p2p_slot_time_data, attestation_votes = await asyncio.gather(
                    self.get_maximum_attestation_votes(slot),
                    self.get_proposer_entity(proposer_data.proposer_validator_index),
                    self.get_block_seen_at_slot_time(slot),
                    self.get_blob_seen_at_slot_time(slot),
                    self.get_block_first_seen_in_p2p_slot_time(slot),
                    self.get_blob_first_seen_in_p2p_slot_time(slot),
                    self.get_attestation_votes(slot, block_data.block_root)
                )
            except Exception as e:
                logger.error(f"Failed to get timing data: {str(e)}")
                raise

            # Store slot data with 24h TTL
            logger.debug("Storing slot data...")
            try:
                data = transform_slot_data_for_storage(
                    slot=slot,
                    network=self.network_name,
                    processed_at=datetime.now(timezone.utc).isoformat(),
                    processing_time_ms=int((datetime.now(timezone.utc) - started_at).total_seconds() * 1000),
                    block_data=block_data.to_dict(),
                    proposer_data=proposer_data.to_dict(),
                    entity=entity,
                    block_seen_at_slot_time_data=block_seen_at_slot_time_data,
                    blob_seen_at_slot_time_data=blob_seen_at_slot_time_data,
                    block_first_seen_in_p2p_slot_time_data=block_first_seen_in_p2p_slot_time_data,
                    blob_first_seen_in_p2p_slot_time_data=blob_first_seen_in_p2p_slot_time_data,
                    attestation_votes=attestation_votes,
                    maximum_attestation_votes=maximum_attestation_votes
                ).to_dict()
                
                key = self.ctx.storage_key(f"slots", self.network_name, f"{slot}.json")
                await self.ctx.storage.store(
                    key,
                    io.BytesIO(json.dumps(data).encode()),
                    cache_control="public,max-age=86400,s-maxage=86400"
                )
            except Exception as e:
                logger.error(f"Failed to store slot data: {str(e)}")
                raise
            
            return True
        except Exception as e:
            self.logger.error(f"Error processing slot {slot}: {str(e)}")
            return False

    async def process_head_slot(self, slot: int) -> None:
        """Process a single head slot."""
        self.logger.info(f"Processing head slot {slot} for network {self.network_name}")
        success = await self.process_slot(slot)
        if success:
            self.logger.info(f"Successfully processed head slot {slot} for network {self.network_name}")
        else:
            self.logger.error(f"Failed to process head slot {slot} for network {self.network_name}")

    async def process_backlog_slot(self, slot: int) -> None:
        """Process a single backlog slot."""
        self.logger.info(f"Processing backlog slot {slot} for network {self.network_name}")
        try:
            await self.process_slot(slot)
            self.logger.info(f"Successfully processed backlog slot {slot} for network {self.network_name}")
        except Exception as e:
            self.logger.error(f"Failed to process backlog slot {slot} for network {self.network_name}: {str(e)}")
            raise e

    async def _run_head_processor(self) -> None:
        """Run the head slot processor loop."""
        self.logger.info(f"Starting head processor for network {self.network_name}")
        
        state = await self._get_processor_state("forward")
        
        while not self._stop_event.is_set():
            try:
                # Get current slot minus lag
                current_slot = self.network.clock.get_current_slot()
                
                target_slot = current_slot - self.head_lag_slots

                self.logger.info(f"Current slot: {current_slot}, target slot: {target_slot}, state.current_slot: {state.current_slot}")

                # Process head if needed
                if state.current_slot is None or state.current_slot < target_slot:
                    await self.process_head_slot(target_slot)
                    state.current_slot = target_slot
                    state.target_slot = current_slot
                    await self._save_processor_state(state)

                # Small sleep to prevent tight loop
                # Sleep until next slot
                start_time, end_time = self.network.clock.get_slot_window(current_slot)
                time_to_next_slot = (end_time - datetime.now(timezone.utc)).total_seconds()
                self.logger.info(f"Sleeping for {time_to_next_slot} seconds until next slot")
                await asyncio.sleep(max(0, time_to_next_slot))
            except Exception as e:
                self.logger.error(f"Error in head processor: {str(e)}")
                await asyncio.sleep(1)  # Sleep longer on error

    async def _run_backlog_processor(self) -> None:
        """Run the backlog slot processor loop."""
        self.logger.info(f"Starting backlog processor for network {self.network_name}")
        
        state = await self._get_processor_state("backward")

        while not self._stop_event.is_set():
            try:
                if state.current_slot > state.target_slot:
                    await self.process_backlog_slot(state.current_slot)
                    state.current_slot -= 1
                    await self._save_processor_state(state)
                    
                    # Sleep between backlog slots to prevent flooding
                    await asyncio.sleep(self.BACKLOG_SLEEP_MS / 1000)
                else:
                    # No backlog to process, sleep longer
                    await asyncio.sleep(1)
            except Exception as e:
                self.logger.error(f"Error in backlog processor: {str(e)}")
                await asyncio.sleep(1)  # Sleep longer on error

    async def start(self) -> None:
        """Start the processor."""
        
        self._head_task = asyncio.create_task(self._run_head_processor())
        # self._backlog_task = asyncio.create_task(self._run_backlog_processor())

    async def stop(self) -> None:
        """Stop the processor."""
        self._stop_event.set()
        
        if self._head_task:
            self._head_task.cancel()
            try:
                await self._head_task
            except asyncio.CancelledError:
                pass
        
        if self._backlog_task:
            self._backlog_task.cancel()
            try:
                await self._backlog_task
            except asyncio.CancelledError:
                pass

    def get_slot_window(self, slot: int) -> Tuple[datetime, datetime]:
        start_time, end_time = self.network.clock.get_slot_window(slot)

        # Add 15 minutes to the start and end times
        start_time = start_time - timedelta(minutes=15)
        end_time = end_time + timedelta(minutes=15)

        return start_time, end_time

    async def get_proposer_data(self, slot: int) -> ProposerData:
        """Get proposer data for a given slot."""
        # Get start and end dates for the slot +- 15 minutes
        start_time, end_time = self.get_slot_window(slot)

        # Convert to ClickHouse format
        start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')

        proposer_query = text("""
            SELECT
                slot,
                proposer_pubkey,
                proposer_validator_index
            FROM default.beacon_api_eth_v1_proposer_duty FINAL
            WHERE
                slot = :slot
                AND slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
                AND meta_network_name = :network
            GROUP BY slot, proposer_pubkey, proposer_validator_index
            LIMIT 1
        """)
        
        proposer_result = self.ctx.clickhouse.execute(
            proposer_query,
            {
                "slot": slot,
                "start_date": start_str,
                "end_date": end_str,
                "network": self.network_name
            }
        )
        
        proposer_rows = proposer_result.fetchall()
        self.logger.debug(f"Got {len(proposer_rows)} proposer rows for slot {slot}")
        if not proposer_rows:
            raise Exception(f"No proposer data found for slot {slot}")
            
        row = proposer_rows[0]  # We're using LIMIT 1 so there's only one row
        self.logger.debug(f"Processing proposer row for slot {slot}: {row}")
        
        try:
            return ProposerData(
                slot=row[0],
                proposer_pubkey=row[1],
                proposer_validator_index=row[2]
            )
        except Exception as e:
            self.logger.error(f"Failed to create ProposerData for slot {slot} from row {row}: {str(e)}")
            raise

    async def get_proposer_entity(self, index: int) -> str:
        """Get entity for a given validator index."""
        entity_query = text("""
            SELECT
                entity
            FROM default.ethseer_validator_entity FINAL
            WHERE
                index = :index
                AND meta_network_name = :network
            GROUP BY entity
            LIMIT 1
        """)
        entity_result = self.ctx.clickhouse.execute(
            entity_query,
            {   
                "index": index,
                "network": self.network_name
            }
        )
        entity_rows = entity_result.fetchall()
        if not entity_rows:
            return None
        
        entity_data = entity_rows[0]
        return entity_data[0]

    
    async def get_block_data(self, slot: int) -> BlockData:
        """Get block data for a given slot."""
        # Get start and end dates for the slot +- 15 minutes
        start_time, end_time = self.get_slot_window(slot)

        # Convert to ClickHouse format
        start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')


        block_query = text("""
            SELECT
                slot,
                slot_start_date_time,
                epoch,
                epoch_start_date_time,
                block_root,
                block_version,
                block_total_bytes,
                block_total_bytes_compressed,
                parent_root,
                state_root,
                proposer_index,
                eth1_data_block_hash,
                eth1_data_deposit_root,
                execution_payload_block_hash,
                execution_payload_block_number,
                execution_payload_fee_recipient,
                execution_payload_base_fee_per_gas,
                execution_payload_blob_gas_used,
                execution_payload_excess_blob_gas,
                execution_payload_gas_limit,
                execution_payload_gas_used,
                execution_payload_state_root,
                execution_payload_parent_hash,
                execution_payload_transactions_count,
                execution_payload_transactions_total_bytes,
                execution_payload_transactions_total_bytes_compressed
            FROM default.beacon_api_eth_v2_beacon_block FINAL
            WHERE
                slot = :slot
                AND slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
                AND meta_network_name = :network
            GROUP BY slot, slot_start_date_time, epoch, epoch_start_date_time, block_root, block_version, block_total_bytes, block_total_bytes_compressed, parent_root, state_root, proposer_index, eth1_data_block_hash, eth1_data_deposit_root, execution_payload_block_hash, execution_payload_block_number, execution_payload_fee_recipient, execution_payload_base_fee_per_gas, execution_payload_blob_gas_used, execution_payload_excess_blob_gas, execution_payload_gas_limit, execution_payload_gas_used, execution_payload_state_root, execution_payload_parent_hash, execution_payload_transactions_count, execution_payload_transactions_total_bytes, execution_payload_transactions_total_bytes_compressed
            LIMIT 1
        """)
        block_result = self.ctx.clickhouse.execute(
            block_query,
            {
                "slot": slot,
                "start_date": start_str,
                "end_date": end_str,
                "network": self.network_name
            }
        )
        block_rows = block_result.fetchall()
        if not block_rows:
            raise Exception(f"No block data found for slot {slot}")
            
        row = block_rows[0]  # We're using LIMIT 1 so there's only one row
        return BlockData(
            slot=row[0],
            slot_start_date_time=row[1],
            epoch=row[2],
            epoch_start_date_time=row[3],
            block_root=row[4],
            block_version=row[5],
            block_total_bytes=row[6],
            block_total_bytes_compressed=row[7],
            parent_root=row[8],
            state_root=row[9],
            proposer_index=row[10],
            eth1_data_block_hash=row[11],
            eth1_data_deposit_root=row[12],
            execution_payload_block_hash=row[13],
            execution_payload_block_number=row[14],
            execution_payload_fee_recipient=row[15],
            execution_payload_base_fee_per_gas=row[16],
            execution_payload_blob_gas_used=row[17],
            execution_payload_excess_blob_gas=row[18],
            execution_payload_gas_limit=row[19],
            execution_payload_gas_used=row[20],
            execution_payload_state_root=row[21],
            execution_payload_parent_hash=row[22],
            execution_payload_transactions_count=row[23],
            execution_payload_transactions_total_bytes=row[24],
            execution_payload_transactions_total_bytes_compressed=row[25]
        )

    async def get_block_seen_at_slot_time(self, slot: int) -> List[SeenAtSlotTimeData]:
        """Get seen at slot time data for a given slot."""
        # Get start and end dates for the slot +- 15 minutes
        start_time, end_time = self.get_slot_window(slot)

        # Convert to ClickHouse format
        start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')


        query = text("""
            WITH api_events AS (
                SELECT
                    propagation_slot_start_diff as slot_time,
                    meta_client_name,
                    meta_client_geo_city, 
                    meta_client_geo_country,
                    meta_client_geo_continent_code,
                    event_date_time
                FROM default.beacon_api_eth_v1_events_block FINAL
                WHERE
                    slot = :slot
                    AND meta_network_name = :network
                    AND slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
            ),
            head_events AS (
                SELECT 
                    propagation_slot_start_diff as slot_time,
                    meta_client_name,
                    meta_client_geo_city,
                    meta_client_geo_country, 
                    meta_client_geo_continent_code,
                    event_date_time
                FROM default.beacon_api_eth_v1_events_block FINAL
                WHERE
                    slot = :slot
                    AND meta_network_name = :network
                    AND slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
            ),
            combined_events AS (
                SELECT * FROM api_events
                UNION ALL
                SELECT * FROM head_events
            )
            SELECT
                slot_time,
                meta_client_name,
                meta_client_geo_city,
                meta_client_geo_country,
                meta_client_geo_continent_code
            FROM (
                SELECT *,
                    ROW_NUMBER() OVER (PARTITION BY meta_client_name ORDER BY event_date_time ASC) as rn
                FROM combined_events
            ) t
            WHERE rn = 1
            ORDER BY event_date_time ASC
        """)
        result = self.ctx.clickhouse.execute(
            query,
            {   
                "slot": slot,
                "network": self.network_name,
                "start_date": start_str,
                "end_date": end_str
            }
        )
        rows = result.fetchall()
        if not rows:
            return []
        
        seen_at_slot_time_data = []
        for row in rows:
            d = SeenAtSlotTimeData(
                slot_time_ms=row[0],
                meta_client_name=row[1],
                meta_client_geo_city=row[2] or "",  # Handle NULL values
                meta_client_geo_country=row[3] or "",
                meta_client_geo_continent_code=row[4] or ""
            )
            seen_at_slot_time_data.append(d)

        return seen_at_slot_time_data

    async def get_block_first_seen_in_p2p_slot_time(self, slot: int) -> List[SeenAtSlotTimeData]:
        """Get first seen in P2P slot time data for a given slot."""
        # Get start and end dates for the slot +- 15 minutes
        start_time, end_time = self.get_slot_window(slot)

        # Convert to ClickHouse format
        start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')


        query = text("""
            SELECT
                propagation_slot_start_diff as slot_time,
                meta_client_name,
                meta_client_geo_city,
                meta_client_geo_country,
                meta_client_geo_continent_code
            FROM (
                SELECT *,
                    ROW_NUMBER() OVER (PARTITION BY meta_client_name ORDER BY event_date_time ASC) as rn
                FROM default.libp2p_gossipsub_beacon_block FINAL
                WHERE
                    slot = :slot
                    AND meta_network_name = :network
                    AND slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
            ) t
            WHERE rn = 1
            ORDER BY event_date_time ASC
        """)
        result = self.ctx.clickhouse.execute(
            query,
            {   
                "slot": slot,
                "network": self.network_name,
                "start_date": start_str,
                "end_date": end_str
            }
        )
        rows = result.fetchall()
        if not rows:
            return []
        
        seen_at_slot_time_data = []
        for row in rows:
            d = SeenAtSlotTimeData(
                slot_time_ms=row[0],
                meta_client_name=row[1],
                meta_client_geo_city=row[2],
                meta_client_geo_country=row[3],
                meta_client_geo_continent_code=row[4]
            )
            seen_at_slot_time_data.append(d)

        return seen_at_slot_time_data

    async def get_blob_first_seen_in_p2p_slot_time(self, slot: int) -> List[BlobSeenAtSlotTimeData]:
        """Get first seen in P2P slot time data for a given slot."""
        # Get start and end dates for the slot +- 15 minutes
        start_time, end_time = self.get_slot_window(slot)

        # Convert to ClickHouse format
        start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')

        query = text("""
            SELECT
                propagation_slot_start_diff as slot_time,
                meta_client_name,
                meta_client_geo_city,
                meta_client_geo_country,
                meta_client_geo_continent_code,
                blob_index
            FROM (
                SELECT *,
                    ROW_NUMBER() OVER (PARTITION BY meta_client_name, blob_index ORDER BY event_date_time ASC) as rn
                FROM default.libp2p_gossipsub_blob_sidecar FINAL
                WHERE
                    slot = :slot
                    AND meta_network_name = :network
                    AND slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
            ) t
            WHERE rn = 1
            ORDER BY event_date_time ASC
        """)
        result = self.ctx.clickhouse.execute(
            query,
            {   
                "slot": slot,
                "network": self.network_name,
                "start_date": start_str,
                "end_date": end_str
            }
        )
        rows = result.fetchall()
        if not rows:
            return []
        
        seen_at_slot_time_data = []
        for row in rows:
            d = BlobSeenAtSlotTimeData(
                slot_time_ms=row[0],
                meta_client_name=row[1],
                meta_client_geo_city=row[2] or "",  # Handle NULL values
                meta_client_geo_country=row[3] or "",
                meta_client_geo_continent_code=row[4] or "",
                blob_index=row[5]
            )
            
            seen_at_slot_time_data.append(d)

        return seen_at_slot_time_data

    async def get_blob_seen_at_slot_time(self, slot: int) -> List[BlobSeenAtSlotTimeData]:
        """Get seen at slot time data for a given slot."""
        # Get start and end dates for the slot +- 15 minutes
        start_time, end_time = self.get_slot_window(slot)

        # Convert to ClickHouse format
        start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')


        query = text("""
            SELECT
                propagation_slot_start_diff as slot_time,
                meta_client_name,
                meta_client_geo_city,
                meta_client_geo_country,
                meta_client_geo_continent_code,
                blob_index
            FROM (
                SELECT *,
                    ROW_NUMBER() OVER (PARTITION BY meta_client_name, blob_index ORDER BY event_date_time ASC) as rn
                FROM default.beacon_api_eth_v1_events_blob_sidecar FINAL
                WHERE
                    slot = :slot
                    AND meta_network_name = :network
                    AND slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
            ) t
            WHERE rn = 1
            ORDER BY event_date_time ASC
        """)
        result = self.ctx.clickhouse.execute(
            query,
            {   
                "slot": slot,
                "network": self.network_name,
                "start_date": start_str,
                "end_date": end_str
            }
        )
        rows = result.fetchall()
        if not rows:
            return []
        
        seen_at_slot_time_data = []
        for row in rows:
            d = BlobSeenAtSlotTimeData(
                slot_time_ms=row[0],
                meta_client_name=row[1],
                meta_client_geo_city=row[2] or "",  # Handle NULL values
                meta_client_geo_country=row[3] or "",
                meta_client_geo_continent_code=row[4] or "",
                blob_index=row[5]
            )
            
            seen_at_slot_time_data.append(d)

        return seen_at_slot_time_data

    async def get_maximum_attestation_votes(self, slot: int) -> int:
        """Get maximum attestation votes for a given slot."""
        # Get start and end dates for the slot +- 15 minutes
        start_time, end_time = self.get_slot_window(slot)

        # Convert to ClickHouse format
        start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')

        query = text("""
            SELECT 
                MAX(committee_size * CAST(committee_index AS UInt32)) as max_attestations
            FROM (
                SELECT
                    length(validators) as committee_size,
                    committee_index
                FROM default.beacon_api_eth_v1_beacon_committee FINAL
                WHERE
                    slot = :slot
                    AND meta_network_name = :network
                    AND slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
            )
        """)
        
        result = self.ctx.clickhouse.execute(
            query,
            {   
                "slot": slot,
                "network": self.network_name,
                "start_date": start_str,
                "end_date": end_str
            }
        )
        row = result.fetchone()
        if not row or row[0] is None:
            return 0
            
        return row[0]

    async def get_attestation_votes(self, slot: int, beacon_block_root: str) -> Dict[int, int]:
        """Get attestation votes for a given slot and block root."""
        # Get start and end dates for the slot +- 2 minutes
        start_time, end_time = self.get_slot_window(slot)

        # Convert to ClickHouse format
        start_str = start_time.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_time.strftime('%Y-%m-%d %H:%M:%S')

        query = text("""
            WITH 
            raw_data AS (
                SELECT 
                    attesting_validator_index,
                    MIN(propagation_slot_start_diff) as min_propagation_time
                FROM default.beacon_api_eth_v1_events_attestation
                WHERE
                    slot = :slot
                    AND meta_network_name = :network
                    AND slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
                    AND beacon_block_root = :block_root
                    AND attesting_validator_index IS NOT NULL
                    AND propagation_slot_start_diff <= 12000
                GROUP BY attesting_validator_index
            ),
            floor_time AS (
                SELECT MIN(min_propagation_time) as floor_time
                FROM raw_data
            )
            SELECT
                attesting_validator_index,
                FLOOR((min_propagation_time - floor_time) / 50) * 50 + floor_time as min_propagation_time
            FROM raw_data, floor_time
        """)
        result = self.ctx.clickhouse.execute(
            query,
            {   
                "slot": slot,
                "network": self.network_name,
                "start_date": start_str,
                "end_date": end_str,
                "block_root": beacon_block_root
            }
        )
        
        attestation_times = {}
        for row in result:
            attestation_times[row[0]] = row[1]
            
        return attestation_times

    async def process(self) -> None:
        """Process slot data."""
        return