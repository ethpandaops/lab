"""Slot processor for Beacon module."""
from ast import Tuple
import asyncio
from datetime import datetime, timezone, timedelta
import math
from typing import Optional, Dict, Any, List, Tuple
import json
import io

from pydantic import BaseModel, Field
from sqlalchemy import text
from geonamescache import GeonamesCache
from functools import lru_cache

from lab.core import logger
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
        self.last_processed_slot: Optional[int] = state.get("last_processed_slot")

    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary for storage."""
        return {
            "target_slot": self.target_slot,
            "current_slot": self.current_slot,
            "direction": self.direction,
            "last_processed_slot": self.last_processed_slot
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
    geo_latitude: Optional[float] = None
    geo_longitude: Optional[float] = None

    @classmethod
    def extract_username(cls, name: str) -> str:
        """Extract username from node name."""
        parts = name.split("/")
        if len(parts) < 2:
            return ""
        
        if "ethpandaops" in name:
            return "ethpandaops"
        
        return parts[1]

    @staticmethod
    @lru_cache(maxsize=1024)  # Cache up to 1024 locations
    def get_coordinates(city: str | None, country: str | None, continent: str | None) -> Optional[Tuple[float, float]]:
        """Get coordinates for a location with fallbacks.
        
        Args:
            city: City name (optional)
            country: Country name (optional)
            continent: Continent code (optional)
            
        Returns:
            Tuple of (latitude, longitude) or None if no location could be determined
            
        Fallback order:
        1. Exact city match (if city and country provided)
        2. Most populous city match (if only city provided)
        3. Country capital (if country provided)
        4. Continent center (if continent provided)
        5. None
        """
        try:
            gc = GeonamesCache()
            
            # Try city-level match first if we have both city and country
            if city and country:
                cities = gc.get_cities()
                city_search = city.lower().strip()
                country_search = country.lower().strip()
                
                # First try exact match with both city and country
                for city_data in cities.values():
                    if (city_data['name'].lower() == city_search and 
                        city_data['countrycode'].lower() == country_search):
                        return (float(city_data['latitude']), float(city_data['longitude']))
                
                # If no exact match, try just matching city name (taking the most populous)
                matching_cities = []
                for city_data in cities.values():
                    if city_data['name'].lower() == city_search:
                        matching_cities.append(city_data)
                
                if matching_cities:
                    # Sort by population and take the largest
                    largest_city = max(matching_cities, key=lambda x: x['population'])
                    return (float(largest_city['latitude']), float(largest_city['longitude']))
            
            # Try country-level match if we have a country
            if country:
                countries = gc.get_countries()
                country_search = country.lower().strip()
                
                # Find the country
                for country_data in countries.values():
                    if country_data['name'].lower() == country_search:
                        # Get the capital city
                        capital = country_data.get('capital')
                        if capital:
                            # Search for the capital in cities
                            cities = gc.get_cities()
                            for city_data in cities.values():
                                if (city_data['name'].lower() == capital.lower() and 
                                    city_data['countrycode'].lower() == country_data['iso'].lower()):
                                    return (float(city_data['latitude']), float(city_data['longitude']))
            
            # Fall back to continent center points if we have a continent
            if continent:
                continent_coords = {
                    'NA': (-100, 40),    # North America
                    'SA': (-58, -20),    # South America
                    'EU': (15, 50),      # Europe
                    'AF': (20, 0),       # Africa
                    'AS': (100, 35),     # Asia
                    'OC': (135, -25),    # Oceania
                    'AN': (0, -90),      # Antarctica
                }
                if continent.upper() in continent_coords:
                    return continent_coords[continent.upper()]
                
        except Exception:
            pass
        
        return None

    def __init__(self, **data):
        """Initialize node with extracted username and geocoded coordinates."""
        if "username" not in data:
            data["username"] = self.extract_username(data["name"])

        # Add coordinates if we don't have them
        if data.get("geo_latitude") is None and data.get("geo_longitude") is None:
            coords = self.get_coordinates(
                data.get("geo_city"),
                data.get("geo_country"),
                data.get("geo_continent_code")
            )
            if coords:
                data["geo_latitude"], data["geo_longitude"] = coords

        super().__init__(**data)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "username": self.username,
            "geo": {
                "city": self.geo_city,
                "country": self.geo_country,
                "continent": self.geo_continent_code,
                "latitude": self.geo_latitude,
                "longitude": self.geo_longitude
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
    maximum_attestation_votes: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "slot": self.slot,
            "network": self.network_name,
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
                "windows": [w.to_dict() for w in self.attestation_windows],
                "maximum_votes": self.maximum_attestation_votes
            }
        }

class BacklogConfig(BaseModel):
    """Configuration for backlog processing.
    Only one of fork_name, target_date, or target_slot should be set.
    """
    fork_name: Optional[str] = None
    target_date: Optional[datetime] = None
    target_slot: Optional[int] = None

    def __init__(self, **data):
        super().__init__(**data)
        if sum(x is not None for x in [self.fork_name, self.target_date, self.target_slot]) > 1:
            raise ValueError("Only one of fork_name, target_date, or target_slot should be set")

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

    BACKLOG_SLEEP_MS = 500  # Sleep between backlog slot processing

    def __init__(self, ctx: ModuleContext, network_name: str, network: EthereumNetwork, network_config: BeaconNetworkConfig):
        """Initialize slot processor."""
        super().__init__(ctx, f"slot_{network_name}")
        self.network = network
        self.network_config = network_config
        self.network_name = network_name
        
        # Get network-specific config
        self.head_lag_slots = network_config.head_lag_slots
        
        # Set default backlog config to Deneb fork
        self.backlog_config = BacklogConfig(fork_name="deneb")
        
        # Tasks
        self._head_task = None
        self._middle_task = None
        self._backlog_task = None
        self._stop_event = asyncio.Event()
        self.logger = self.logger.bind(network=network_name)

    def _calculate_target_backlog_slot(self) -> int:
        """Calculate target slot based on backlog config."""
        current_slot = self.network.clock.get_current_slot()

        if self.backlog_config.fork_name:
            # Get the epoch for the specified fork
            fork_epoch = self.network.get_fork_epoch(self.backlog_config.fork_name)
            if fork_epoch is None:
                raise ValueError(f"Unknown fork name: {self.backlog_config.fork_name}")
            return fork_epoch * 32  # Convert epoch to slot

        if self.backlog_config.target_date:
            # Calculate slot from target date
            target_timestamp = int(self.backlog_config.target_date.timestamp())
            genesis_timestamp = self.network.genesis_time
            seconds_per_slot = self.network.config.seconds_per_slot
            return (target_timestamp - genesis_timestamp) // seconds_per_slot

        if self.backlog_config.target_slot is not None:
            return self.backlog_config.target_slot

        # Default to 1 day ago
        return current_slot - 1 * 24 * 60 * 60 // self.network.config.seconds_per_slot

    async def _get_processor_state(self, direction: str) -> SlotProcessorState:
        """Get processor state from state manager."""
        try:
            state = await self.ctx.state.get(f"{self.name}_{direction}")
        except Exception as e:
            self.logger.debug(f"No existing state found for {direction}, initializing new state: {str(e)}")
            state = {}
        
        if not state:
            # Initialize with current state based on network
            wallclock_slot = self.network.clock.get_current_slot()
            
            head_target_slot = wallclock_slot - self.head_lag_slots

            if direction == "forward":
                state = {
                    "target_slot": head_target_slot,
                    "current_slot": head_target_slot - 1,  # Start one behind
                    "direction": direction
                }
            elif direction == "middle":
                # For middle processor, start from 1 hour ago (assuming 12s slots = 300 slots)
                target_slot = head_target_slot - 300
                start_slot = max(0, target_slot - 300)
                state = {
                    "target_slot": target_slot,
                    "last_processed_slot": start_slot,
                    "direction": direction
                }
            else:  # backward
                target_slot = self._calculate_target_backlog_slot()
                state = {
                    "target_slot": target_slot,
                    "current_slot": head_target_slot,
                    "direction": direction
                }
            # Save initial state
            await self.ctx.state.set(f"{self.name}_{direction}", state)
            
        return SlotProcessorState(state)

    async def _save_processor_state(self, state: SlotProcessorState) -> None:
        """Save processor state to state manager."""
        await self.ctx.state.set(f"{self.name}_{state.direction}", state.to_dict())

    def _get_storage_key(self, slot: int) -> str:
        """Get storage key for a given slot."""
        return self.ctx.storage_key(f"slots", self.network.name, f"{slot}.json")

    async def process_slot(self, slot: int) -> bool:
        """Process a single slot.
        
        Args:
            slot: Slot number to process
            
        Returns:
            bool: True if processing was successful
        """
        try:
            # Check if we've already processed this slot
            if await self.ctx.storage.exists(self._get_storage_key(slot)):
                self.logger.debug(f"Slot {slot} already processed, skipping")
                return True

            started_at = datetime.now(timezone.utc)

            self.logger.debug(f"Processing slot {slot} for network {self.name}")

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
                    network=self.name,
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
                
                await self.ctx.storage.store(
                    self._get_storage_key(slot),
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
        self.logger.info(f"Processing head slot {slot} for network {self.name}")
        success = await self.process_slot(slot)
        if success:
            self.logger.info(f"Successfully processed head slot {slot} for network {self.name}")
        else:
            self.logger.error(f"Failed to process head slot {slot} for network {self.name}")

    async def process_backlog_slot(self, slot: int) -> None:
        """Process a single backlog slot."""
        self.logger.info(f"Processing backlog slot {slot} for network {self.name}")
        try:
            await self.process_slot(slot)
            self.logger.info(f"Successfully processed backlog slot {slot} for network {self.name}")
        except Exception as e:
            self.logger.error(f"Failed to process backlog slot {slot} for network {self.name}: {str(e)}")
            raise e

    async def _run_head_processor(self) -> None:
        """Run the head slot processor loop."""
        self.logger.info(f"Starting head processor for network {self.name}")
        
        try:
            while not self._stop_event.is_set():
                try:
                    # Get current slot minus lag
                    current_slot = self.network.clock.get_current_slot()
                    target_slot = current_slot - self.head_lag_slots

                    # Always process head slot to ensure live data
                    await self.process_head_slot(target_slot)

                    # Small sleep to prevent tight loop
                    try:
                        await asyncio.wait_for(self._stop_event.wait(), timeout=0.05)
                        break
                    except asyncio.TimeoutError:
                        continue
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    self.logger.error(f"Error in head processor: {str(e)}")
                    try:
                        await asyncio.wait_for(self._stop_event.wait(), timeout=1)
                        break
                    except asyncio.TimeoutError:
                        continue
        except asyncio.CancelledError:
            pass
        finally:
            self.logger.info(f"Head processor stopped for network {self.name}")

    async def _run_backlog_processor(self) -> None:
        """Run the backlog processor loop."""
        target_slot = self._calculate_target_backlog_slot()
        self.logger.info(f"Starting backlog processor for network {self.name}. Target slot: {target_slot}")
        
        try:
            state = await self._get_processor_state("backward")

            while not self._stop_event.is_set():
                try:
                    if state.current_slot > target_slot:
                        await self.process_backlog_slot(state.current_slot)
                        state.current_slot -= 1
                        await self._save_processor_state(state)
                        
                        # Sleep between backlog slots to prevent flooding
                        try:
                            await asyncio.wait_for(self._stop_event.wait(), timeout=self.BACKLOG_SLEEP_MS / 1000)
                            break
                        except asyncio.TimeoutError:
                            continue
                    else:
                        # No backlog to process, sleep longer
                        try:
                            await asyncio.wait_for(self._stop_event.wait(), timeout=1)
                            break
                        except asyncio.TimeoutError:
                            continue
                except asyncio.CancelledError:
                    break
                except Exception as e:
                    self.logger.error(f"Error in backlog processor: {str(e)}")
                    try:
                        await asyncio.wait_for(self._stop_event.wait(), timeout=1)
                        break
                    except asyncio.TimeoutError:
                        continue
        except asyncio.CancelledError:
            pass
        finally:
            self.logger.info(f"Backlog processor stopped for network {self.name}")

    async def start(self) -> None:
        """Start the processor."""
        self.logger.info(f"Starting processor for network {self.name}")

        # Start head processor
        self._head_task = self._create_task(self._run_head_processor())

        # Start middle processor and wait for it to complete
        self._middle_task = self._create_task(self._run_middle_processor())
        try:
            await self._middle_task
            self.logger.info(f"Middle processor completed for network {self.name}")
        except asyncio.CancelledError:
            self.logger.info(f"Middle processor cancelled for network {self.name}")
            return
        except Exception as e:
            self.logger.error(f"Middle processor failed for network {self.name}: {str(e)}")
            return

        # Start backlog processor only after middle processor completes
        self._backlog_task = self._create_task(self._run_backlog_processor())

    async def stop(self) -> None:
        """Stop the processor."""
        self.logger.info(f"Stopping processor for network {self.name}")
        self._stop_event.set()

        tasks = []
        
        # Cancel and collect tasks
        if self._head_task:
            self._head_task.cancel()
            tasks.append(self._head_task)
            
        if self._middle_task:
            self._middle_task.cancel()
            tasks.append(self._middle_task)
            
        if self._backlog_task:
            self._backlog_task.cancel()
            tasks.append(self._backlog_task)

        # Wait for all tasks to complete
        if tasks:
            try:
                await asyncio.gather(*tasks, return_exceptions=True)
            except asyncio.CancelledError:
                pass

        # Clear task references
        self._head_task = None
        self._middle_task = None
        self._backlog_task = None

        self.logger.info(f"Processor stopped for network {self.name}")

    async def _run_middle_processor(self) -> None:
        """Run the middle processor loop."""
        self.logger.info(f"Starting middle processor for network {self.name}")

        try:
            # Get current state
            state = await self._get_processor_state("middle")
            if state.last_processed_slot is None:
                raise ValueError("Middle processor state missing last_processed_slot")

            current_slot = state.last_processed_slot
            target_slot = state.target_slot

            # Process slots until we catch up
            while not self._stop_event.is_set() and current_slot < target_slot:
                try:
                    # Process the slot
                    success = await self.process_slot(current_slot)
                    if success:
                        self.logger.info(f"Successfully processed middle slot {current_slot} for network {self.name}")
                        current_slot += 1
                        # Save state with direction preserved
                        await self._save_processor_state(SlotProcessorState({
                            "last_processed_slot": current_slot,
                            "target_slot": target_slot,
                            "direction": "middle"
                        }))
                    else:
                        self.logger.error(f"Failed to process middle slot {current_slot} for network {self.name}")
                        current_slot += 1  # Skip failed slot

                    # Small sleep to prevent tight loop
                    try:
                        await asyncio.wait_for(self._stop_event.wait(), timeout=0.05)
                        break
                    except asyncio.TimeoutError:
                        continue

                except asyncio.CancelledError:
                    raise
                except Exception as e:
                    self.logger.error(f"Error in middle processor: {str(e)}")
                    current_slot += 1  # Skip errored slot
                    continue

            self.logger.info(f"Middle processor caught up for network {self.name}")

        except asyncio.CancelledError:
            self.logger.info(f"Middle processor cancelled for network {self.name}")
            raise
        except Exception as e:
            self.logger.error(f"Middle processor failed for network {self.name}: {str(e)}")
            raise

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
                "network": self.network.name
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
                "network": self.network.name
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
                "network": self.network.name
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
                "network": self.network.name,
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
                "network": self.network.name,
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
                "network": self.network.name,
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
                "network": self.network.name,
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
                MAX(committee_size * (CAST(committee_index AS UInt32) + 1)) as max_attestations
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
                "network": self.network.name,
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
        # Get start and end dates for the slot without any grace period
        start_time, end_time = self.network.clock.get_slot_window(slot)

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
                "network": self.network.name,
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

    def get_frontend_config(self, root_config: Optional["Config"] = None) -> Dict[str, Any]:
        """Get frontend-friendly config."""
        config = super().get_frontend_config()
        networks = {}
        for network_name, network_config in self.get_network_config(root_config).items():
            networks[network_name] = {
                "head_lag_slots": network_config.head_lag_slots
            }
        config.update({
            "networks": networks
        })
        
        return config