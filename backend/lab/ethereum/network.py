"""Ethereum network configuration and utilities."""
import asyncio
from datetime import datetime, timezone
from typing import Dict, Optional
import aiohttp
import yaml
from pydantic import BaseModel, Field, field_validator
from logging import Logger
from .time import WallClock

class ForkVersion(BaseModel):
    """Fork epoch information."""
    epoch: int

class NetworkConfig(BaseModel):
    """Parsed network configuration."""
    # Basic info
    preset_base: str = Field(alias="PRESET_BASE")
    config_name: str = Field(alias="CONFIG_NAME")
    
    # Genesis
    min_genesis_active_validator_count: int = Field(alias="MIN_GENESIS_ACTIVE_VALIDATOR_COUNT")
    min_genesis_time: int = Field(alias="MIN_GENESIS_TIME")
    genesis_delay: int = Field(alias="GENESIS_DELAY")

    # Fork versions
    altair_fork_epoch: int = Field(alias="ALTAIR_FORK_EPOCH")
    bellatrix_fork_epoch: int = Field(alias="BELLATRIX_FORK_EPOCH")
    capella_fork_epoch: int = Field(alias="CAPELLA_FORK_EPOCH")
    deneb_fork_epoch: int = Field(alias="DENEB_FORK_EPOCH")
    electra_fork_epoch: Optional[int] = Field(None, alias="ELECTRA_FORK_EPOCH")

    # Time parameters
    seconds_per_slot: int = Field(alias="SECONDS_PER_SLOT")

class EthereumNetwork:
    """Represents an Ethereum network and its configuration."""

    def __init__(self, name: str, config_url: str, logger: Logger, genesis_time: int):
        """Initialize network."""
        self.name = name
        self.config_url = config_url
        self.config: Optional[NetworkConfig] = None
        self._forks: Dict[str, ForkVersion] = {}
        self.clock: Optional[WallClock] = None
        self.logger = logger
        self._genesis_time = genesis_time

    @property
    def genesis_time(self) -> int:
        """Get network genesis time."""
        return self._genesis_time

    @property
    def forks(self) -> Dict[str, ForkVersion]:
        """Get network forks."""
        return self._forks

    async def initialize(self) -> None:
        """Initialize network by downloading and parsing config."""
        # Download config
        self.logger.info("Downloading config", config_url=self.config_url)
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.config_url) as response:
                    response.raise_for_status()
                    raw_config = await response.text()
        except Exception as e:
            self.logger.error("Error downloading config", error=e)
            raise

        # Parse YAML config
        config_dict = yaml.safe_load(raw_config)
        self.config = NetworkConfig.model_validate(config_dict)

        # Initialize wall clock
        self.clock = WallClock(
            genesis_time=self.genesis_time,
            seconds_per_slot=self.config.seconds_per_slot
        )

        # Store fork information
        self._forks = {
            "genesis": ForkVersion(
                epoch=0
            ),
            "altair": ForkVersion(
                epoch=self.config.altair_fork_epoch
            ),
            "bellatrix": ForkVersion(
                epoch=self.config.bellatrix_fork_epoch
            ),
            "capella": ForkVersion(
                epoch=self.config.capella_fork_epoch
            ),
            "deneb": ForkVersion(
                epoch=self.config.deneb_fork_epoch
            ),
        }

        # Add electra fork if it exists
        if self.config.electra_fork_epoch is not None:
            self._forks["electra"] = ForkVersion(
                epoch=self.config.electra_fork_epoch
            )

    def get_current_fork(self, slot: Optional[int] = None) -> str:
        """Get the current fork name based on slot number or current time."""
        if not self.config or not self.clock:
            raise RuntimeError("Network not initialized")

        # If no slot provided, get current slot
        if slot is None:
            slot = self.clock.get_current_slot()

        epoch = slot // self.clock.SLOTS_PER_EPOCH

        # Check forks in reverse chronological order
        if self.config.electra_fork_epoch is not None and epoch >= self.config.electra_fork_epoch:
            return "electra"
        if epoch >= self.config.deneb_fork_epoch:
            return "deneb"
        if epoch >= self.config.capella_fork_epoch:
            return "capella"
        if epoch >= self.config.bellatrix_fork_epoch:
            return "bellatrix"
        if epoch >= self.config.altair_fork_epoch:
            return "altair"
        return "genesis"

    def get_fork_version(self, fork_name: str) -> Optional[str]:
        """Get fork version by name."""
        if not self.config:
            raise RuntimeError("Network not initialized")
        
        fork = self._forks.get(fork_name)
        return fork.version if fork else None

    def get_fork_epoch(self, fork_name: str) -> Optional[int]:
        """Get fork epoch by name."""
        if not self.config:
            raise RuntimeError("Network not initialized")
        
        fork = self._forks.get(fork_name)
        return fork.epoch if fork else None 
    def get_forks(self) -> Dict[str, ForkVersion]:
        """Get all forks."""
        return self._forks
