"""Beacon module."""
import asyncio
from typing import Dict

from lab.core.module import Module, ModuleContext
from lab.modules.beacon.processors.slot import SlotProcessor
from lab.ethereum import EthereumNetwork

class BeaconModule(Module):
    """Beacon module."""

    @property
    def name(self) -> str:
        """Get module name."""
        return "beacon"

    def __init__(self, ctx: ModuleContext):
        """Initialize module."""
        super().__init__(ctx)
        
        if not ctx.networks or not ctx.root_config:
            raise RuntimeError("Beacon module requires network information and root config")

        # Get merged network configs
        network_configs = ctx.config.get_network_config(ctx.root_config)
        
        # Initialize processors with merged network configs
        self._processors = {}
        for network_name, network_config in network_configs.items():
            self.logger.debug("Initializing processor for network", network_name=network_name)
            # Get network from manager
            network = ctx.networks.get_network(network_name)
            
            # Create processor for this network
            self._processors[f"slot.{network_name}"] = SlotProcessor(
                ctx,
                network_name,
                network,
                network_config
            )
        
        self.logger.info("Initialized Beacon module")

    async def start(self) -> None:
        """Start module."""
        self.logger.info("Starting Beacon module")

        # Start all processors
        for name, processor in self._processors.items():
            self.logger.info(f"Starting {name} processor")
            await processor.start()

    async def stop(self) -> None:
        """Stop module."""
        self.logger.info("Stopping Beacon module")
        await super().stop()
        
        # Stop all processors
        for name, processor in self._processors.items():
            self.logger.debug(f"Stopping {name} processor")
            await processor.stop()
            self.logger.info(f"Stopped {name} processor") 