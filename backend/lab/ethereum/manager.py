"""Ethereum networks manager."""
import asyncio
from logging import Logger
from typing import Dict

from lab.core.config import Config
from .network import EthereumNetwork

class NetworkManager:
    """Manages Ethereum networks and their configurations."""

    def __init__(self, config: Config, logger: Logger):
        """Initialize network manager."""
        self.config = config
        self.networks: Dict[str, EthereumNetwork] = {}
        self.logger = logger
    async def initialize(self) -> None:
        """Initialize all networks from config."""
        # Create network instances
        for network_name, network_config in self.config.ethereum.networks.items():
            self.networks[network_name] = EthereumNetwork(
                name=network_name,
                config_url=network_config.config_url,
                logger=self.logger,
                genesis_time=network_config.genesis_time
            )

        # Initialize all networks concurrently
        await asyncio.gather(*[
            network.initialize() for network in self.networks.values()
        ])

    def get_network(self, name: str) -> EthereumNetwork:
        """Get a network by name."""
        if name not in self.networks:
            raise KeyError(f"Network {name} not found")
        return self.networks[name] 