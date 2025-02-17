"""Base processor for Xatu Public Contributors module."""
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Dict, Any

from lab.core import logger as lab_logger
from lab.core.module import ModuleContext
from lab.core.config import TimeWindowConfig

class BaseProcessor(ABC):
    """Base processor for Xatu Public Contributors module."""

    def __init__(self, ctx: ModuleContext, name: str):
        """Initialize base processor."""
        self.ctx = ctx
        self.name = name
        self.logger = lab_logger.get_logger(f"{ctx.name}.{name}")

    async def _get_processor_state(self) -> Dict[str, Any]:
        """Get processor state from state manager."""
        try:
            state = await self.ctx.state.get(self.name)
        except KeyError:
            # Initialize state if it doesn't exist
            state = {
                "last_processed": 0,
                "last_processed_windows": {}
            }
            await self.ctx.state.set(self.name, state)
        
        # Ensure state has the correct format
        if not isinstance(state.get("last_processed"), (int, float)):
            state["last_processed"] = 0
        if not isinstance(state.get("last_processed_windows"), dict):
            state["last_processed_windows"] = {}
        
        return state

    async def should_process(self) -> bool:
        """Check if processor should run based on last run time."""
        state = await self._get_processor_state()
        
        now = int(datetime.now(timezone.utc).timestamp())
        interval = self.ctx.config.get_interval_timedelta()
        interval_seconds = int(interval.total_seconds())
        last_processed = int(state["last_processed"])
        
        # If never processed, or interval has passed
        return last_processed == 0 or (now - last_processed) >= interval_seconds

    async def should_process_window(self, window: TimeWindowConfig) -> bool:
        """Check if a specific time window should be processed."""
        state = await self._get_processor_state()
        
        now = int(datetime.now(timezone.utc).timestamp())
        step_seconds = int(window.get_step_timedelta().total_seconds())
        
        last_processed = int(state["last_processed_windows"].get(window.file, 0))
        
        # If never processed, or step interval has passed
        return last_processed == 0 or (now - last_processed) >= step_seconds

    async def update_last_processed(self) -> None:
        """Update last processed time."""
        state = await self._get_processor_state()
        state["last_processed"] = int(datetime.now(timezone.utc).timestamp())
        await self.ctx.state.set(self.name, state)

    async def update_window_last_processed(self, window: TimeWindowConfig) -> None:
        """Update last processed time for a specific window."""
        state = await self._get_processor_state()
        state["last_processed_windows"][window.file] = int(datetime.now(timezone.utc).timestamp())
        await self.ctx.state.set(self.name, state)

    @abstractmethod
    async def process(self) -> None:
        """Process data. Must be implemented by subclasses."""
        pass 