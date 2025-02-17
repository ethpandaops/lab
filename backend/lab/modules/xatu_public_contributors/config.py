"""Configuration for Xatu Public Contributors module."""
from typing import List

from pydantic import BaseModel, Field, field_validator

class XatuPublicContributorsConfig(BaseModel):
    """Configuration for Xatu Public Contributors module."""

    enabled: bool = Field(default=True, description="Whether the module is enabled")
    networks: List[str] = Field(default=["mainnet"], description="Networks to process")
    interval: str = Field(default="5m", description="Interval to process summary data")
    interval_seconds: int = Field(default=300, description="Interval in seconds")

    @field_validator("interval")
    def validate_interval(cls, v: str) -> str:
        """Validate interval."""
        if not v.endswith(("s", "m", "h", "d")):
            raise ValueError("interval must end with s, m, h, or d")
        return v 