"""Beacon module."""
import asyncio
from typing import Dict

from lab.core.module import Module, ModuleContext
from lab.modules.beacon.processors.blocks import BlocksProcessor

class BeaconModule(Module):
    """Beacon module."""

    @property
    def name(self) -> str:
        """Get module name."""
        return "beacon"

    def __init__(self, ctx: ModuleContext):
        """Initialize module."""
        super().__init__(ctx)
        self._processors = {
            "blocks": BlocksProcessor(ctx)
        }
        self._tasks: Dict[str, asyncio.Task] = {}
        self.logger.info("Initialized Beacon module")

    async def start(self) -> None:
        """Start module."""
        self.logger.info("Starting Beacon module")

        # Start processing tasks
        for name, processor in self._processors.items():
            self._tasks[name] = asyncio.create_task(self._run_processor(name, processor))
            self.logger.info(f"Started {name} processor")

    async def stop(self) -> None:
        """Stop module."""
        self.logger.info("Stopping Beacon module")
        await super().stop()
        
        # Cancel all tasks
        for name, task in self._tasks.items():
            self.logger.debug(f"Cancelling {name} processor")
            task.cancel()
            try:
                await task
                self.logger.info(f"Successfully cancelled {name} processor")
            except asyncio.CancelledError:
                self.logger.info(f"Cancelled {name} processor")
                pass

    async def _run_processor(self, name: str, processor: BlocksProcessor) -> None:
        """Run processor in a loop."""
        self.logger.info(f"Starting {name} processor loop")
        interval = self.ctx.config.get_interval_timedelta()

        while not self._stop_event.is_set():
            try:
                await processor.process()
            except Exception as e:
                self.logger.error(f"{name} processor failed", error=str(e))

            # Wait for next interval or stop event
            try:
                self.logger.debug(f"Waiting for next {name} interval", seconds=interval.total_seconds())
                await asyncio.wait_for(
                    self._stop_event.wait(),
                    timeout=interval.total_seconds()
                )
            except asyncio.TimeoutError:
                continue 