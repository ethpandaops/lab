"""Summary processor for Xatu Public Contributors module."""
import time
from datetime import datetime, timedelta, timezone
from typing import Dict, List
import io
import json

from sqlalchemy import text

from lab.core import logger as lab_logger
from lab.core.module import ModuleContext

from ..models import SummaryData, NetworkStats, NodeCount

class SummaryProcessor:
    """Summary processor for Xatu Public Contributors module."""

    def __init__(self, ctx: ModuleContext):
        """Initialize summary processor."""
        self.ctx = ctx
        self.logger = lab_logger.get_logger(f"{ctx.name}.summary")

    async def process(self) -> None:
        """Process summary data."""
        self.logger.info("Processing summary data")
        
        # Get last 1h window
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(hours=1)

        # Format dates without microseconds for Clickhouse
        start_str = start_date.strftime('%Y-%m-%d %H:%M:%S')
        end_str = end_date.strftime('%Y-%m-%d %H:%M:%S')

        query = text("""
            SELECT
                meta_network_name,
                meta_client_geo_country as country,
                meta_client_geo_continent_code as continent,
                meta_client_geo_city as city,
                meta_client_name,
                meta_consensus_implementation,
                count(*) as count
            FROM beacon_api_eth_v1_events_block FINAL
            WHERE
                slot_start_date_time BETWEEN toDateTime(:start_date) AND toDateTime(:end_date)
                AND meta_network_name IN (:networks)
                AND meta_client_name != ''
                AND meta_client_name IS NOT NULL
            GROUP BY meta_network_name, country, continent, city, meta_client_name, meta_consensus_implementation
        """)

        self.logger.info("Fetching data for last 1h")
        result = self.ctx.clickhouse.execute(
            query,
            {
                "start_date": start_str,
                "end_date": end_str,
                "networks": self.ctx.config.networks
            }
        )
        rows = result.fetchall()

        if len(rows) == 0:
            self.logger.warning("No data found for last 1h")
            return

        # Build summary data per network
        summary = SummaryData(
            updated_at=int(datetime.now(timezone.utc).timestamp()),
            networks={}
        )
        
        # Initialize network stats
        for network in self.ctx.config.networks:
            summary.networks[network] = NetworkStats()

        # Process each row
        for row in rows:
            network, country, continent, city, client_name, consensus_impl, count = row
            is_public = not client_name.startswith('ethpandaops')
            
            # Add to network totals
            summary.networks[network].total_nodes += 1
            if is_public:
                summary.networks[network].total_public_nodes += 1

            # Add to network countries
            if country not in summary.networks[network].countries:
                summary.networks[network].countries[country] = NodeCount()
            summary.networks[network].countries[country].total_nodes += 1
            if is_public:
                summary.networks[network].countries[country].public_nodes += 1

            # Add to network continents
            if continent not in summary.networks[network].continents:
                summary.networks[network].continents[continent] = NodeCount()
            summary.networks[network].continents[continent].total_nodes += 1
            if is_public:
                summary.networks[network].continents[continent].public_nodes += 1

            # Add to network cities
            if city not in summary.networks[network].cities:
                summary.networks[network].cities[city] = NodeCount()
            summary.networks[network].cities[city].total_nodes += 1
            if is_public:
                summary.networks[network].cities[city].public_nodes += 1

            # Add to network consensus implementations
            if consensus_impl not in summary.networks[network].consensus_implementations:
                summary.networks[network].consensus_implementations[consensus_impl] = NodeCount()
            summary.networks[network].consensus_implementations[consensus_impl].total_nodes += 1
            if is_public:
                summary.networks[network].consensus_implementations[consensus_impl].public_nodes += 1

        # Store summary data
        self.logger.info("Storing summary data")
        key = self.ctx.storage_key("summary.json")
        await self.ctx.storage.store_atomic(
            key,
            io.BytesIO(json.dumps(summary.dict()).encode()),
            content_type="application/json"
        ) 