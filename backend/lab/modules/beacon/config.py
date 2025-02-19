"""Configuration for Beacon module."""
from typing import Dict, Optional

from pydantic import BaseModel, Field

class BeaconNetworkConfig(BaseModel):
    """Configuration for a specific network in the Beacon module."""
    head_lag_slots: Optional[int] = Field(
        default=None,
        description="Number of slots to lag behind head for processing (default: 2)"
    )
    backlog_days: Optional[int] = Field(
        default=None,
        description="Number of days to backfill (default: 3)"
    )

class BeaconConfig(BaseModel):
    """Configuration for Beacon module."""
    enabled: bool = Field(default=True, description="Whether the module is enabled")
    networks: Dict[str, BeaconNetworkConfig] = Field(
        default_factory=dict,
        description="Network-specific configuration for the beacon module"
    ) 