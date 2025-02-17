"""Configuration for Xatu Public Contributors module."""
from typing import List

from pydantic import BaseModel, Field, field_validator

from lab.core.config import TimeWindowConfig

class XatuPublicContributorsConfig(BaseModel):
    """Configuration for Xatu Public Contributors module."""

    enabled: bool = Field(default=True, description="Whether the module is enabled")
    networks: List[str] = Field(default=["mainnet"], description="Networks to process")
    interval: str = Field(default="5m", description="Interval to process summary data")
    interval_seconds: int = Field(default=300, description="Interval in seconds")
    time_windows: List[TimeWindowConfig] = Field(default=[
        TimeWindowConfig(file="last_90_days", step="3d", label="Last 90d", range="-90d"),
        TimeWindowConfig(file="last_30_days", step="1d", label="Last 30d", range="-30d"),
        TimeWindowConfig(file="last_1_day", step="1h", label="Last 1d", range="-1d"),
        TimeWindowConfig(file="last_6h", step="5m", label="Last 6h", range="-6h")
    ], description="Time windows to process")

    @field_validator("interval")
    def validate_interval(cls, v: str) -> str:
        """Validate interval."""
        if not v.endswith(("s", "m", "h", "d")):
            raise ValueError("interval must end with s, m, h, or d")
        return v 