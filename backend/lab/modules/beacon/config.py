"""Configuration for Beacon module."""
from typing import List
from datetime import timedelta

from pydantic import BaseModel, Field, field_validator

class BeaconConfig(BaseModel):
    """Configuration for Beacon module."""

    enabled: bool = Field(default=True, description="Whether the module is enabled")
    networks: List[str] = Field(default=["mainnet"], description="Networks to process")
    interval: str = Field(default="5m", description="Processing interval")

    @field_validator("interval")
    def validate_interval(cls, v: str) -> str:
        """Validate interval."""
        if not v.endswith(("s", "m", "h", "d")):
            raise ValueError("interval must end with s, m, h, or d")
        return v

    def get_interval_timedelta(self) -> timedelta:
        """Convert interval string to timedelta."""
        unit = self.interval[-1]
        value = int(self.interval[:-1])
        match unit:
            case 's': return timedelta(seconds=value)
            case 'm': return timedelta(minutes=value)
            case 'h': return timedelta(hours=value)
            case 'd': return timedelta(days=value)
            case _: raise ValueError(f"Invalid duration unit: {unit}") 