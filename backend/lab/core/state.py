"""State management for the Lab backend."""
import asyncio
import io
import json
from typing import Any, Dict, Optional
from dataclasses import asdict, is_dataclass

from lab.core import logger
from lab.core.storage import Storage

logger = logger.get_logger()

class StateManager:
    """State manager implementation using S3."""

    def __init__(self, name: str, storage: Storage, flush_interval: int = 60):
        """Initialize state manager."""
        self.name = name
        self.storage = storage
        self.flush_interval = flush_interval
        self._lock = asyncio.Lock()
        self._state: Dict[str, Any] = {}
        self._flush_task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()
        logger.info("Initializing state manager", name=name)

    async def start(self) -> None:
        """Start the state manager."""
        logger.info("Starting state manager", name=self.name)
        
        # Try to load existing state
        try:
            # Load existing state
            async for chunk in self.storage.get("state.json"):
                full_state = json.loads(chunk.decode())
                self._state = full_state.get(self.name, {})
                logger.info("Loaded existing state", name=self.name)
                break
        except Exception as e:
            if "NoSuchKey" in str(e):
                logger.info("No existing state found, creating empty state file")
                empty_state = {self.name: {}}
                state_json = json.dumps(empty_state).encode()
                await self.storage.store_atomic("state.json", io.BytesIO(state_json))
            else:
                logger.error("Failed to initialize state - cannot continue", error=str(e))
                raise

        # Start flush task
        self._flush_task = asyncio.create_task(self._flush_loop())
        logger.info("Started state manager", name=self.name)

    async def stop(self) -> None:
        """Stop the state manager."""
        logger.info("Stopping state manager", name=self.name)
        if self._flush_task is not None:
            self._stop_event.set()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass
            self._flush_task = None

        # Final flush
        try:
            await self.flush()
            logger.info("Final state flush complete", name=self.name)
        except Exception as e:
            logger.error("Failed to flush state on shutdown", error=str(e))

    async def flush(self) -> None:
        """Force a flush of state to S3."""
        async with self._lock:
            await self._write_state_to_s3()

    async def _write_state_to_s3(self) -> None:
        """Write state to S3 atomically."""
        # Load existing state first
        try:
            full_state = {}
            async for chunk in self.storage.get("state.json"):
                full_state = json.loads(chunk.decode())
                break
        except Exception:
            logger.debug("No existing state found, creating new state file")
            full_state = {}

        # Update with our module's state
        full_state[self.name] = self._state

        # Write back
        state_json = json.dumps(full_state).encode()
        await self.storage.store_atomic("state.json", io.BytesIO(state_json))

    async def _flush_loop(self) -> None:
        """Periodically flush state to S3."""
        logger.debug("Starting flush loop", interval=60)
        while not self._stop_event.is_set():
            try:
                await asyncio.sleep(60)
                await self.flush()
                logger.debug("Flushed state to S3")
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Failed to flush state", error=str(e))
                continue

    async def get(self, key: str) -> Any:
        """Get a value from state."""
        async with self._lock:
            if key not in self._state:
                logger.debug("Key not found", key=key)
                raise KeyError(f"Key not found: {key}")
            return self._state[key]

    async def set(self, key: str, value: Any) -> None:
        """Set a value in state."""
        logger.debug("Setting state value", key=key)
        async with self._lock:
            self._state[key] = value

    async def delete(self, key: str) -> None:
        """Delete a value from state."""
        logger.debug("Deleting state value", key=key)
        async with self._lock:
            self._state.pop(key, None)

    async def get_all(self) -> Dict[str, Any]:
        """Get all values from state."""
        logger.debug("Getting all state values")
        async with self._lock:
            return self._state.copy()

    async def delete_all(self) -> None:
        """Delete all values from state."""
        logger.debug("Deleting all state values")
        async with self._lock:
            self._state.clear() 