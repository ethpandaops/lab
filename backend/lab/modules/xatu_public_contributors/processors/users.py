"""Users processor for Xatu Public Contributors module."""
import io
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List

from sqlalchemy import text

from lab.core import logger as lab_logger
from lab.core.module import ModuleContext
from lab.core.config import TimeWindowConfig

class UsersProcessor:
    """Users processor for Xatu Public Contributors module."""

    def __init__(self, ctx: ModuleContext):
        """Initialize users processor."""
        self.ctx = ctx
        self.logger = lab_logger.get_logger(f"{ctx.name}.users")

    async def process(self) -> None:
        """Process users data."""
        self.logger.info("Processing users data")

        for window in self.ctx.config.time_windows:
            # Convert window range to time range
            end_date = datetime.now(timezone.utc)
            range_delta = window.get_range_timedelta()
            start_date = end_date + range_delta  # range is negative, so we add
            step_seconds = int(window.get_step_timedelta().total_seconds())

            # Format dates without microseconds for Clickhouse
            start_str = start_date.strftime('%Y-%m-%d %H:%M:%S')
            end_str = end_date.strftime('%Y-%m-%d %H:%M:%S')

            query = text("""
                WITH time_slots AS (
                    SELECT 
                        toStartOfInterval(slot_start_date_time, INTERVAL :step_seconds second) as time_slot,
                        extractAll(meta_client_name, '/([^/]+)/[^/]+$')[1] as username,
                        meta_network_name,
                        count(distinct meta_client_name) AS node_count
                    FROM beacon_api_eth_v1_events_block FINAL
                    WHERE
                        slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
                        AND meta_client_name NOT LIKE 'ethpandaops%'
                        AND meta_network_name IN (:networks)
                        AND meta_client_name != ''
                        AND meta_client_name IS NOT NULL
                    GROUP BY time_slot, username, meta_network_name
                )
                SELECT
                    time_slot as time,
                    username,
                    meta_network_name,
                    node_count
                FROM time_slots
            """)

            self.logger.info(f"Fetching data for {window.file}")
            result = self.ctx.clickhouse.execute(
                query,
                {
                    "start_date": start_str,
                    "end_date": end_str,
                    "networks": self.ctx.config.networks,
                    "step_seconds": step_seconds
                }
            )
            users = result.fetchall()

            if len(users) == 0:
                self.logger.warning(f"No users found for time window {window.file}")
                continue

            self.logger.info(f"Found {len(users)} user entries for time window {window.file}")

            # Group by network and write separate files
            for network in self.ctx.config.networks:
                network_users = [u for u in users if u[2] == network]
                if not network_users:
                    continue

                # Group by timestamp
                time_grouped = []
                for u in network_users:
                    timestamp = int(u[0].timestamp())
                    time_grouped.append({
                        "time": timestamp,
                        "users": [{
                            "name": u[1],
                            "nodes": u[3]
                        }]
                    })

                # Merge entries with same timestamp
                merged = {}
                for entry in time_grouped:
                    if entry["time"] not in merged:
                        merged[entry["time"]] = entry
                    else:
                        merged[entry["time"]]["users"].extend(entry["users"])

                # Convert to list
                final_data = list(merged.values())

                # Store data
                key = self.ctx.storage_key(f"users/{network}/{window.file}.json")
                await self.ctx.storage.store_atomic(
                    key,
                    io.BytesIO(json.dumps(final_data).encode()),
                    content_type="application/json"
                ) 