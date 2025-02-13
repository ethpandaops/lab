"""ClickHouse client implementation for the Lab backend."""
from typing import Any, Dict, List, Optional, Tuple, Union
from urllib.parse import urlparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Connection

from lab.core import logger
from lab.core.config import ClickHouseConfig

logger = logger.get_logger()

class ClickHouseClient:
    """ClickHouse client implementation."""

    def __init__(self, config: ClickHouseConfig):
        """Initialize ClickHouse client."""
        self.config = config
        self._connection: Optional[Connection] = None

        # Parse URL components
        self.url = config.get_url()
        self._engine = create_engine(self.url)
        logger.info("Initialized ClickHouse client")

    async def start(self) -> None:
        """Start the client."""
        logger.info("Starting ClickHouse client")
        if self._connection is not None:
            logger.debug("Connection already exists")
            return

        # Create connection
        logger.debug("Creating new connection")
        self._connection = self._engine.connect()

        # Test connection
        try:
            self.execute("SELECT 1")
            logger.info("Successfully connected to ClickHouse")
        except Exception as e:
            logger.error("Failed to connect to ClickHouse", error=str(e))
            raise

    async def stop(self) -> None:
        """Stop the client."""
        logger.info("Stopping ClickHouse client")
        if self._connection is not None:
            self._connection.close()
            self._connection = None
            logger.info("ClickHouse client stopped")

    def execute(
        self,
        query: Union[str, text],
        params: Optional[Union[Dict[str, Any], Tuple[Any, ...]]] = None,
    ):
        """Execute a query and return all results."""
        if self._connection is None:
            raise RuntimeError("Client not started")

        try:
            # Convert string to SQLAlchemy text
            if isinstance(query, str):
                query = text(query)
            # Execute query
            result = self._connection.execute(query, params)
            return result

        except Exception as e:
            raise 