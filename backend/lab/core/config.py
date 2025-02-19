"""Configuration models for the Lab backend."""
from typing import List, Optional, Tuple, Dict, Any
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

class ModuleConfig(BaseModel):
    """Base module configuration."""
    enabled: bool = False
    description: str = ""
    path_prefix: str = ""

    def get_frontend_config(self) -> Dict[str, Any]:
        """Get frontend-friendly config."""
        return {
            "enabled": self.enabled,
            "description": self.description,
            "path_prefix": self.path_prefix
        }

class BeaconChainTimingsConfig(ModuleConfig):
    """Beacon chain timings module configuration."""
    networks: List[str]
    time_windows: List[TimeWindowConfig]
    interval: str
    description: str = "Beacon chain block timing metrics"
    path_prefix: str = "beacon_chain_timings"

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

    def get_frontend_config(self) -> Dict[str, Any]:
        """Get frontend-friendly config."""
        config = super().get_frontend_config()
        config.update({
            "networks": self.networks,
            "time_windows": [
                {
                    "file": w.file,
                    "step": w.step,
                    "label": w.label,
                    "range": w.range
                } for w in self.time_windows
            ]
        })
        return config

class XatuPublicContributorsConfig(ModuleConfig):
    """Xatu Public Contributors module configuration."""
    networks: List[str]
    time_windows: List[TimeWindowConfig]
    schedule_hours: int
    description: str = "Xatu public contributor metrics"
    path_prefix: str = "xatu_public_contributors"

    def get_interval_timedelta(self) -> timedelta:
        """Get the processing interval."""
        return timedelta(hours=self.schedule_hours)

    def get_window_timedelta(self) -> timedelta:
        """Get the maximum time window."""
        max_range = max(w.get_range_timedelta() for w in self.time_windows)
        return abs(max_range)  # Convert negative range to positive duration

    def get_frontend_config(self) -> Dict[str, Any]:
        """Get frontend-friendly config."""
        config = super().get_frontend_config()
        config.update({
            "networks": self.networks,
            "time_windows": [
                {
                    "file": w.file,
                    "step": w.step,
                    "label": w.label,
                    "range": w.range
                } for w in self.time_windows
            ]
        })
        return config

class BeaconNetworkConfig(BaseModel):
    """Configuration for a specific network in the Beacon module."""
    head_lag_slots: Optional[int] = Field(
        default=2,
        description="Number of slots to lag behind head for processing (default: 2)"
    )
    backlog_days: Optional[int] = Field(
        default=3,
        description="Number of days to backfill (default: 3)"
    )

class BeaconConfig(ModuleConfig):
    """Beacon module configuration."""
    networks: Optional[Dict[str, BeaconNetworkConfig]] = Field(
        default=None,
        description="Network-specific configuration for the beacon module. If not provided, uses root-level networks."
    )
    description: str = "Beacon chain metrics"
    path_prefix: str = "beacon"

    def get_network_config(self, root_config: Optional["Config"]) -> Dict[str, BeaconNetworkConfig]:
        """Get merged network configuration.
        
        Uses root-level network list as base, and overlays any module-specific network configs.
        """
        # Start with empty dict if no root config or no networks
        merged = {}
        
        # Add root networks if available
        if root_config and root_config.ethereum and root_config.ethereum.networks:
            merged = {
                network_name: BeaconNetworkConfig()
                for network_name in root_config.ethereum.networks.keys()
            }

        # Overlay any module-specific network configs
        if self.networks:
            for network_name, network_config in self.networks.items():
                merged[network_name] = network_config

        # If no networks configured at all, add mainnet as default
        if not merged:
            merged["mainnet"] = BeaconNetworkConfig()

        return merged

    def get_frontend_config(self, root_config: Optional["Config"] = None) -> Dict[str, Any]:
        """Get frontend-friendly config.
        
        Args:
            root_config: Optional root configuration to get network information from.
        """
        config = super().get_frontend_config()
        networks = {}
        for network_name, network_config in self.get_network_config(root_config).items():
            networks[network_name] = {
                "head_lag_slots": network_config.head_lag_slots,
                "backlog_days": network_config.backlog_days
            }
        config.update({
            "networks": networks
        })
            
        return config

class ModulesConfig(BaseModel):
    """Modules configuration."""
    beacon_chain_timings: Optional[BeaconChainTimingsConfig] = None
    xatu_public_contributors: Optional[XatuPublicContributorsConfig] = None
    beacon: Optional[BeaconConfig] = None

class EthereumNetworkConfig(BaseModel):
    """Configuration for an Ethereum network."""
    config_url: str = Field(description="URL to the network's beacon chain config.yaml")
    genesis_time: int = Field(description="Unix timestamp of the network's genesis")

class EthereumConfig(BaseModel):
    """Configuration for Ethereum networks."""
    networks: Dict[str, EthereumNetworkConfig] = Field(
        default_factory=dict,
        description="Map of network name to network configuration"
    )

class Config(BaseSettings):
    """Main configuration."""
    storage: StorageConfig
    clickhouse: ClickHouseConfig
    modules: ModulesConfig
    ethereum: EthereumConfig = Field(default_factory=EthereumConfig)

    def get_frontend_config(self) -> Dict[str, Any]:
        """Generate frontend-friendly config."""
        ethereum_config = {
            "networks": {
                network_name: {
                    "genesis_time": network_config.genesis_time
                }
                for network_name, network_config in self.ethereum.networks.items()
            }
        }
        frontend_config = {
            "modules": {},
            "ethereum": ethereum_config
        }

        # Add module configs
        if self.modules.beacon_chain_timings:
            frontend_config["modules"]["beacon_chain_timings"] = (
                self.modules.beacon_chain_timings.get_frontend_config()
            )
        
        if self.modules.xatu_public_contributors:
            frontend_config["modules"]["xatu_public_contributors"] = (
                self.modules.xatu_public_contributors.get_frontend_config()
            )

        if self.modules.beacon:
            frontend_config["modules"]["beacon"] = (
                self.modules.beacon.get_frontend_config(root_config=self)
            )

        return frontend_config

    @classmethod
    def from_yaml(cls, path: str) -> "Config":
        """Load configuration from YAML file."""
        import yaml
        with open(path, 'r', encoding='utf-8') as f:
            data = yaml.safe_load(f)
        return cls.model_validate(data) 
