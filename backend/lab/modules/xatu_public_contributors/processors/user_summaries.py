"""User summaries processor for Xatu Public Contributors module."""
import io
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from sqlalchemy import text

from lab.core import logger as lab_logger
from lab.core.module import ModuleContext
from .base import BaseProcessor

class UserSummariesProcessor(BaseProcessor):
    """User summaries processor for Xatu Public Contributors module."""

    def __init__(self, ctx: ModuleContext):
        """Initialize user summaries processor."""
        super().__init__(ctx, "user_summaries")

    async def process(self) -> None:
        """Process user summaries data."""
        if not await self.should_process():
            self.logger.debug("Skipping processing - interval not reached")
            return

        self.logger.info("Processing user summaries data")

        query = text("""
            WITH latest_events AS (
                SELECT
                    meta_client_name,
                    meta_network_name,
                    meta_client_implementation,
                    meta_client_version,
                    meta_consensus_implementation,
                    meta_consensus_version,
                    meta_client_geo_country,
                    meta_client_geo_city,
                    meta_client_geo_continent_code,
                    slot,
                    slot_start_date_time,
                    ROW_NUMBER() OVER (PARTITION BY meta_client_name ORDER BY slot_start_date_time DESC) as rn
                FROM beacon_api_eth_v1_events_block FINAL
                WHERE
                    slot_start_date_time >= now() - INTERVAL 24 HOUR
                    AND meta_network_name IN (:networks)
                    AND meta_client_name != ''
                    AND meta_client_name IS NOT NULL
            )
            SELECT
                CASE
                    WHEN meta_client_name LIKE 'pub%' THEN extractAll(meta_client_name, '/([^/]+)/[^/]+$')[1]
                    WHEN meta_client_name LIKE 'ethpandaops%' THEN 'ethpandaops'
                    ELSE extractAll(meta_client_name, '/([^/]+)/[^/]+/')[1]
                END as username,
                meta_network_name,
                meta_client_name,
                meta_consensus_implementation as consensus_client,
                meta_consensus_version as consensus_version,
                meta_client_geo_country as country,
                meta_client_geo_city as city,
                meta_client_geo_continent_code as continent,
                slot as latest_slot,
                toUnixTimestamp(slot_start_date_time) as latest_slot_start_date_time,
                meta_client_implementation as client_implementation,
                meta_client_version as client_version
            FROM latest_events
            WHERE rn = 1
        """)

        self.logger.info("Fetching user summary data for last 24h")
        result = self.ctx.clickhouse.execute(
            query,
            {
                "networks": self.ctx.config.networks
            }
        )
        users = result.fetchall()

        if len(users) == 0:
            self.logger.warning("No users found in last 24h")
            return

        # Group by username
        users_by_name = {}
        summary = {
            "contributors": [],
            "updated_at": int(datetime.now(timezone.utc).timestamp())
        }

        for user in users:
            username = user[0]
            if username not in users_by_name:
                users_by_name[username] = {
                    "name": username,
                    "nodes": [],
                    "updated_at": int(datetime.now(timezone.utc).timestamp())
                }

            users_by_name[username]["nodes"].append({
                "network": user[1],
                "client_name": user[2],
                "consensus_client": user[3],
                "consensus_version": user[4],
                "country": user[5],
                "city": user[6],
                "continent": user[7],
                "latest_slot": user[8],
                "latest_slot_start_date_time": user[9],
                "client_implementation": user[10],
                "client_version": user[11]
            })

        # Write individual user files and build summary
        for username, user_data in users_by_name.items():
            key = self.ctx.storage_key(f"user-summaries/users/{username}.json")
            await self.ctx.storage.store_atomic(
                key,
                io.BytesIO(json.dumps(user_data).encode()),
                content_type="application/json"
            )
            summary["contributors"].append({
                "name": username,
                "node_count": len(user_data["nodes"]),
                "updated_at": int(datetime.now(timezone.utc).timestamp())
            })

        # Write summary file
        key = self.ctx.storage_key("user-summaries/summary.json")
        await self.ctx.storage.store_atomic(
            key,
            io.BytesIO(json.dumps(summary).encode()),
            content_type="application/json"
        )

        self.logger.info(f"Wrote summary data for {len(users_by_name)} users")

        # Update last processed time
        await self.update_last_processed() 