"""Xatu Public Contributors module."""
import asyncio
from datetime import datetime, timezone
from typing import Dict

from lab.core.module import Module, ModuleContext
from lab.modules.xatu_public_contributors.processors.summary import SummaryProcessor
from lab.modules.xatu_public_contributors.processors.countries import CountriesProcessor
from lab.modules.xatu_public_contributors.processors.users import UsersProcessor
from lab.modules.xatu_public_contributors.processors.user_summaries import UserSummariesProcessor

class XatuPublicContributorsModule(Module):
    """Xatu Public Contributors module."""

    @property
    def name(self) -> str:
        """Get module name."""
        return "xatu_public_contributors"

    def __init__(self, ctx: ModuleContext):
        """Initialize module."""
        super().__init__(ctx)
        self._processors = {
            "summary": SummaryProcessor(ctx),
            "countries": CountriesProcessor(ctx),
            "users": UsersProcessor(ctx),
            "user_summaries": UserSummariesProcessor(ctx)
        }
        self.logger.info("Initialized Xatu Public Contributors module")

    async def start(self) -> None:
        """Start module."""
        self.logger.info("Starting Xatu Public Contributors module")

        # Start processing tasks
        for name, processor in self._processors.items():
            self._create_task(self._run_processor(name, processor))
            self.logger.info(f"Started {name} processor")

    async def stop(self) -> None:
        """Stop module."""
        self.logger.info("Stopping Xatu Public Contributors module")
        
        # Let base class handle task cleanup
        await super().stop()

    async def _run_processor(self, name: str, processor: SummaryProcessor) -> None:
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