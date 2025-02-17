"""Runner implementation for the Lab backend."""
import asyncio
from typing import Any, Dict, Optional, Type
import signal
import sys
import json
import io

from lab.core import logger

from lab.core.config import Config
from lab.core.clickhouse import ClickHouseClient
from lab.core.storage import S3Storage, Storage
from lab.core.state import StateManager
from lab.core.module import Module, ModuleContext
from lab.modules.beacon_chain_timings import BeaconChainTimingsModule
from lab.modules.xatu_public_contributors import XatuPublicContributorsModule

logger = logger.get_logger()

class Runner:
    """Runner manages the lifecycle of all modules."""

    def __init__(self, config: Config):
        """Initialize runner."""
        self.config = config
        self.storage: Optional[Storage] = None
        self.clickhouse: Optional[ClickHouseClient] = None
        self.modules: Dict[str, Module] = {}
        self._stop_event = asyncio.Event()
        self._original_sigint_handler = None
        logger.info("Runner initialized")

    async def start(self) -> None:
        """Start the runner and all modules."""
        logger.info("Starting runner")

        # Initialize storage
        logger.debug("Initializing storage")
        self.storage = S3Storage(self.config.storage.s3)

        # Initialize ClickHouse
        logger.debug("Initializing ClickHouse")
        self.clickhouse = ClickHouseClient(self.config.clickhouse)
        await self.clickhouse.start()

        # Write frontend config
        await self._write_frontend_config()

        # Register and start modules
        logger.debug("Starting module registration")
        await self._register_modules()
        logger.debug("Module registration complete, starting modules")
        await self._start_modules()

        # Setup signal handlers
        logger.debug("Setting up signal handlers")
        self._setup_signal_handlers()

        logger.info("Runner started successfully")

        # Wait for stop signal
        logger.debug("Waiting for stop signal")
        try:
            await self._stop_event.wait()
        except asyncio.CancelledError:
            logger.info("Received cancellation")
            self._stop_event.set()

        # Stop everything
        logger.info("Stop signal received")
        await self.stop()

    async def stop(self) -> None:
        """Stop the runner and all modules."""
        logger.info("Stopping runner")

        # Stop modules
        logger.debug("Stopping modules")
        await self._stop_modules()

        # Stop ClickHouse
        if self.clickhouse is not None:
            logger.debug("Stopping ClickHouse")
            await self.clickhouse.stop()

        # Clear stop event
        self._stop_event.clear()

        # Restore original signal handler
        if self._original_sigint_handler:
            signal.signal(signal.SIGINT, self._original_sigint_handler)

        logger.info("Runner stopped")

    def _setup_signal_handlers(self) -> None:
        """Setup signal handlers."""
        logger.debug("Setting up signal handlers")
        loop = asyncio.get_running_loop()

        def handle_signal(sig: int) -> None:
            logger.info(f"Received signal {sig}")
            # Set the stop event in a thread-safe way
            loop.call_soon_threadsafe(self._stop_event.set)

        # Save original SIGINT handler
        self._original_sigint_handler = signal.getsignal(signal.SIGINT)

        # Set up new handlers
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, lambda s=sig: handle_signal(s))

        logger.debug("Signal handlers setup complete")

    async def _handle_signal(self) -> None:
        """Handle termination signals."""
        logger.info("Received shutdown signal")
        self._stop_event.set()

    async def _register_modules(self) -> None:
        """Register all configured modules."""
        if self.storage is None or self.clickhouse is None:
            logger.error("Cannot register modules - storage or clickhouse not initialized")
            raise RuntimeError("Storage and ClickHouse must be initialized")

        # Check beacon chain timings module config
        logger.debug("Checking beacon chain timings module configuration")
        if self.config.modules.beacon_chain_timings is not None and self.config.modules.beacon_chain_timings.enabled:
            await self._register_beacon_chain_timings_module()

        # Check xatu public contributors module config
        logger.debug("Checking xatu public contributors module configuration")
        if self.config.modules.xatu_public_contributors is not None and self.config.modules.xatu_public_contributors.enabled:
            await self._register_xatu_public_contributors_module()

    async def _register_beacon_chain_timings_module(self) -> None:
        """Register beacon chain timings module."""
        try:
            logger.info("Registering beacon chain timings module")
            
            # Create state manager
            logger.debug("Creating state manager")
            state = StateManager("beacon_chain_timings", self.storage)
            await state.start()  # Initialize and test S3 access

            # Create module context
            logger.debug("Creating module context", 
                        networks=self.config.modules.beacon_chain_timings.networks,
                        time_windows=len(self.config.modules.beacon_chain_timings.time_windows))
            ctx = ModuleContext(
                name="beacon_chain_timings",
                config=self.config.modules.beacon_chain_timings,
                storage=self.storage,
                clickhouse=self.clickhouse,
                state=state,
            )

            # Create and register module
            logger.debug("Creating module instance")
            module = BeaconChainTimingsModule(ctx)
            self.modules[module.name] = module
            logger.info("Successfully registered beacon chain timings module")
        except Exception as e:
            logger.error("Failed to register beacon chain timings module", error=str(e))
            raise

    async def _register_xatu_public_contributors_module(self) -> None:
        """Register xatu public contributors module."""
        try:
            logger.info("Registering xatu public contributors module")
            
            # Create state manager
            logger.debug("Creating state manager")
            state = StateManager("xatu_public_contributors", self.storage)
            await state.start()  # Initialize and test S3 access

            # Create module context
            logger.debug("Creating module context", 
                        networks=self.config.modules.xatu_public_contributors.networks)
            ctx = ModuleContext(
                name="xatu_public_contributors",
                config=self.config.modules.xatu_public_contributors,
                storage=self.storage,
                clickhouse=self.clickhouse,
                state=state,
            )

            # Create and register module
            logger.debug("Creating module instance")
            module = XatuPublicContributorsModule(ctx)
            self.modules[module.name] = module
            logger.info("Successfully registered xatu public contributors module")
        except Exception as e:
            logger.error("Failed to register xatu public contributors module", error=str(e))
            raise

    async def _start_modules(self) -> None:
        """Start all registered modules."""
        module_count = len(self.modules)
        logger.info("Starting modules", count=module_count)
        
        if module_count == 0:
            logger.warning("No modules registered")
            return

        for name, module in self.modules.items():
            try:
                logger.debug("Starting module", module=name)
                await module.start()
                logger.info("Successfully started module", module=name)
            except Exception as e:
                logger.error("Failed to start module", 
                           module=name, 
                           error=str(e),
                           error_type=type(e).__name__)
                # Continue with other modules
                continue

    async def _stop_modules(self) -> None:
        """Stop all registered modules."""
        module_count = len(self.modules)
        logger.info("Stopping modules", count=module_count)

        if module_count == 0:
            logger.debug("No modules to stop")
            return

        for name, module in self.modules.items():
            try:
                logger.debug("Stopping module", module=name)
                await module.stop()
                logger.info("Successfully stopped module", module=name)
            except Exception as e:
                logger.error("Failed to stop module", 
                           module=name, 
                           error=str(e),
                           error_type=type(e).__name__)
                continue 

    async def _write_frontend_config(self) -> None:
        """Write frontend config to storage."""
        logger.info("Writing frontend config")
        try:
            # Generate frontend config
            frontend_config = self.config.get_frontend_config()
            
            # Convert to JSON and store
            json_data = json.dumps(frontend_config, indent=2).encode()
            await self.storage.store_atomic(
                "config.json",
                io.BytesIO(json_data),
                content_type="application/json"
            )
            logger.info("Successfully wrote frontend config")
        except Exception as e:
            logger.error("Failed to write frontend config", error=str(e))
            raise 