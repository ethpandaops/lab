"""Module system base classes and interfaces for the Lab backend."""
import asyncio
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional, Protocol

from lab.core import logger as lab_logger
from lab.core.logger import LabLogger
from lab.core.clickhouse import ClickHouseClient
from lab.core.storage import Storage
from lab.core.state import StateManager

class ModuleContext:
    """Context provided to modules."""

    def __init__(
        self,
        name: str,
        config: Any,
        storage: Storage,
        clickhouse: ClickHouseClient,
        state: StateManager,
    ):
        """Initialize module context."""
        self.name = name
        self.config = config
        self.storage = storage
        self.clickhouse = clickhouse
        self.state = state
        # Create a new logger instance with module name
        self.logger = lab_logger.get_logger()
        if isinstance(self.logger, LabLogger):
            self.logger.set_module(name)

    def storage_key(self, *parts: str) -> str:
        """Get a storage key prefixed with the module name."""
        return "/".join([self.name, *parts])

class Module(ABC):
    """Base module interface."""

    def __init__(self, ctx: ModuleContext):
        """Initialize module."""
        self.ctx = ctx
        self.logger = ctx.logger
        self._stop_event = asyncio.Event()

    @property
    @abstractmethod
    def name(self) -> str:
        """Get module name."""
        ...

    @abstractmethod
    async def start(self) -> None:
        """Start the module."""
        ...

    @abstractmethod
    async def stop(self) -> None:
        """Stop the module."""
        self._stop_event.set()

class ModuleFactory(Protocol):
    """Module factory protocol."""

    def __call__(self, ctx: ModuleContext) -> Module:
        """Create a new module instance."""
        ... 