from dataclasses import dataclass
from typing import List, Dict, Optional, Any, Literal
import yaml
from pathlib import Path
from datetime import datetime, timedelta
import re

@dataclass
class TimeWindow:
    file: str
    step: str
    label: str
    range: str

    def get_time_range(self, now: Optional[datetime] = None) -> tuple[datetime, datetime]:
        """Get start and end time for this window based on the range field.
        
        Range formats:
        - "-1d": Last day
        - "-30d": Last 30 days
        - "-2w": Last 2 weeks
        - "-1h": Last hour
        - "+7d": Next 7 days
        - "2024-01-01/2024-03-31": Specific date range
        """
        if now is None:
            now = datetime.now()

        # Handle relative ranges
        if self.range.startswith(("-", "+")):
            amount = int(self.range[1:-1])
            unit = self.range[-1]
            
            if unit == 'd':
                delta = timedelta(days=amount)
            elif unit == 'w':
                delta = timedelta(weeks=amount)
            elif unit == 'h':
                delta = timedelta(hours=amount)
            else:
                raise ValueError(f"Unsupported time unit: {unit}")

            if self.range.startswith("-"):
                return now - delta, now
            else:
                return now, now + delta

        # Handle specific date ranges (YYYY-MM-DD/YYYY-MM-DD)
        elif "/" in self.range:
            start_str, end_str = self.range.split("/")
            start = datetime.strptime(start_str, "%Y-%m-%d")
            end = datetime.strptime(end_str, "%Y-%m-%d")
            return start, end

        raise ValueError(f"Invalid range format: {self.range}")

    def get_step_seconds(self) -> int:
        """Convert step string (e.g., '1h', '1d', '3d', '5m') to seconds"""
        match = re.match(r"(\d+)([mhd])", self.step)
        if not match:
            raise ValueError(f"Invalid step format: {self.step}")
        
        amount = int(match.group(1))
        unit = match.group(2)
        
        if unit == 'm':
            return amount * 60
        elif unit == 'h':
            return amount * 3600
        elif unit == 'd':
            return amount * 86400
        
        raise ValueError(f"Unsupported step unit: {unit}")

@dataclass
class DataConfig:
    type: Literal["fs"]
    path: str

@dataclass
class XatuPublicContributors:
    time_windows: List[TimeWindow]
    data_dir: str
    networks: List[str]
    @classmethod
    def from_dict(cls, data: Dict[str, Any], data_config: DataConfig) -> "XatuPublicContributors":
        return cls(
            time_windows=[TimeWindow(**w) for w in data.get("time_windows", [])],
            data_dir=str(Path(data_config.path) / "xatu-public-contributors"),
            networks=data.get("networks", [])
        )
@dataclass
class MevRelays:
    networks: List[str]
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "MevRelays":
        return cls(
            networks=data.get("networks", [])
        )
@dataclass
class BeaconChainTimings:
    time_windows: List[TimeWindow]
    networks: List[str]
    data_dir: str
    @classmethod
    def from_dict(cls, data: Dict[str, Any], data_config: DataConfig) -> "BeaconChainTimings":
        return cls(
            time_windows=[TimeWindow(**w) for w in data.get("time_windows", [])],
            networks=data.get("networks", []),
            data_dir=str(Path(data_config.path) / "beacon-chain-timings")
        )
@dataclass
class BeaconChainOverview:
    networks: List[str]
    data_dir: str
    @classmethod
    def from_dict(cls, data: Dict[str, Any], data_config: DataConfig) -> "BeaconChainOverview":
        return cls(
            networks=data.get("networks", []),
            data_dir=str(Path(data_config.path) / "beacon-chain-overview")
        )
@dataclass
class NotebookConfig:
    enabled: bool
    schedule_hours: int
    description: str
    # Custom config for each notebook
    config: Dict[str, Any]
    data_config: DataConfig

    def as_xatu_public_contributors(self) -> Optional[XatuPublicContributors]:
        """Convert config to XatuPublicContributors if valid"""
        try:
            return XatuPublicContributors.from_dict(self.config, self.data_config)
        except Exception as e:
            print(f"Failed to parse XatuPublicContributors config: {e}")
            return None
    def as_mev_relays(self) -> Optional[MevRelays]:
        """Convert config to MevRelays if valid"""
        try:
            return MevRelays.from_dict(self.config)
        except Exception as e:
            print(f"Failed to parse MevRelays config: {e}")
            return None
    def as_beacon_chain_timings(self) -> Optional[BeaconChainTimings]:
        """Convert config to BeaconChainTimings if valid"""
        try:
            return BeaconChainTimings.from_dict(self.config, self.data_config)
        except Exception as e:
            print(f"Failed to parse BeaconChainTimings config: {e}")
            return None
    def as_beacon_chain_overview(self) -> Optional[BeaconChainOverview]:
        """Convert config to BeaconChainOverview if valid"""
        try:
            return BeaconChainOverview.from_dict(self.config, self.data_config)
        except Exception as e:
            print(f"Failed to parse BeaconChainOverview config: {e}")
            return None

@dataclass
class Config:
    notebooks: Dict[str, NotebookConfig]
    data: DataConfig

    @classmethod
    def from_file(cls, path: str = "config.yaml") -> "Config":
        """Load config from yaml file"""
        with open(Path(__file__).parent.parent / path) as f:
            data = yaml.safe_load(f)
            
        data_config = DataConfig(**data.get("data", {"type": "fs", "path": "data"}))
            
        notebooks = {}
        for name, nb_data in data.get("notebooks", {}).items():
            # Extract standard fields
            standard_fields = {"enabled", "schedule_hours", "description"}
            # Everything else goes into custom config
            custom_config = {k: v for k, v in nb_data.items() if k not in standard_fields}
            
            notebooks[name] = NotebookConfig(
                enabled=nb_data.get("enabled", False),
                schedule_hours=nb_data.get("schedule_hours", 24),
                description=nb_data.get("description", ""),
                config=custom_config,
                data_config=data_config
            )
            
        return cls(notebooks=notebooks, data=data_config)

    def get_notebook_config(self, notebook_name: str) -> Optional[NotebookConfig]:
        """Helper to get config for a specific notebook"""
        return self.notebooks.get(notebook_name)

def get_config() -> Config:
    """Get the config object"""
    return Config.from_file()
