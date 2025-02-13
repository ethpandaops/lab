"""Configuration models for the Lab backend."""
from typing import List, Optional, Tuple
from datetime import timedelta
from urllib.parse import urlparse, parse_qs

from pydantic import BaseModel, Field, field_validator
from pydantic_settings import BaseSettings

class S3Config(BaseModel):
    """S3 storage configuration."""
    endpoint: str
    region: str
    bucket: str
    access_key_id: str
    secret_access_key: str

class StorageConfig(BaseModel):
    """Storage configuration."""
    s3: S3Config

class ClickHouseConfig(BaseModel):
    """ClickHouse configuration."""
    url: str

    def get_url(self) -> str:
        """Get the URL."""
        return self.url

class TimeWindowConfig(BaseModel):
    """Time window configuration."""
    file: str
    step: str
    label: str
    range: str

    @field_validator("step", "range")
    @classmethod
    def parse_duration(cls, v: str) -> str:
        """Parse duration strings like '6h', '30d' into timedelta."""
        # We keep as string but validate format
        if not any(v.endswith(unit) for unit in ['s', 'm', 'h', 'd']):
            raise ValueError("Duration must end with s, m, h, or d")
        return v

    def get_step_timedelta(self) -> timedelta:
        """Convert step string to timedelta."""
        unit = self.step[-1]
        value = int(self.step[:-1])
        match unit:
            case 's': return timedelta(seconds=value)
            case 'm': return timedelta(minutes=value)
            case 'h': return timedelta(hours=value)
            case 'd': return timedelta(days=value)
            case _: raise ValueError(f"Invalid duration unit: {unit}")

    def get_range_timedelta(self) -> timedelta:
        """Convert range string to timedelta."""
        unit = self.range[-1]
        value = int(self.range[:-1])
        match unit:
            case 's': return timedelta(seconds=value)
            case 'm': return timedelta(minutes=value)
            case 'h': return timedelta(hours=value)
            case 'd': return timedelta(days=value)
            case _: raise ValueError(f"Invalid duration unit: {unit}")

class BeaconChainTimingsConfig(BaseModel):
    """Beacon chain timings module configuration."""
    enabled: bool = False
    networks: List[str]
    time_windows: List[TimeWindowConfig]
    interval: str

    @field_validator("interval")
    @classmethod
    def parse_interval(cls, v: str) -> str:
        """Parse interval duration string."""
        if not any(v.endswith(unit) for unit in ['s', 'm', 'h', 'd']):
            raise ValueError("Interval must end with s, m, h, or d")
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

class ModulesConfig(BaseModel):
    """Modules configuration."""
    beacon_chain_timings: Optional[BeaconChainTimingsConfig] = None

class Config(BaseSettings):
    """Main configuration."""
    storage: StorageConfig
    clickhouse: ClickHouseConfig
    modules: ModulesConfig

    @classmethod
    def from_yaml(cls, path: str) -> "Config":
        """Load configuration from YAML file."""
        import yaml
        with open(path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        return cls.model_validate(data) 