"""Models for Xatu Public Contributors module."""
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any, Union

from pydantic import BaseModel, field_validator, model_validator

class NodeCount(BaseModel):
    """Node count model."""
    total_nodes: int = 0
    public_nodes: int = 0

class NetworkStats(BaseModel):
    """Network stats model."""
    total_nodes: int = 0
    total_public_nodes: int = 0
    countries: Dict[str, NodeCount] = {}
    continents: Dict[str, NodeCount] = {}
    cities: Dict[str, NodeCount] = {}
    consensus_implementations: Dict[str, NodeCount] = {}

class SummaryData(BaseModel):
    """Summary data model."""
    updated_at: int
    networks: Dict[str, NetworkStats] = {}

class ProcessorState(BaseModel):
    """State for a processor."""
    last_processed: int = 0  # Unix timestamp
    last_processed_windows: Dict[str, int] = {}  # window_file -> Unix timestamp

    @model_validator(mode='before')
    @classmethod
    def handle_legacy_format(cls, data: Any) -> Dict[str, Any]:
        """Handle legacy format where data was a dict of strings."""
        if isinstance(data, dict) and "last_processed" not in data:
            # Convert legacy format to new format
            return {
                "last_processed": 0,
                "last_processed_windows": {}
            }
        return data

class ModuleState(BaseModel):
    """Module state model."""
    summary: ProcessorState = ProcessorState()
    countries: ProcessorState = ProcessorState()
    users: ProcessorState = ProcessorState()
    user_summaries: ProcessorState = ProcessorState()

    @model_validator(mode='before')
    @classmethod
    def handle_legacy_format(cls, data: Any) -> Dict[str, Any]:
        """Handle legacy format where only summary existed."""
        if isinstance(data, dict):
            # Ensure all required fields exist
            if "summary" not in data:
                data["summary"] = {}
            if "countries" not in data:
                data["countries"] = {}
            if "users" not in data:
                data["users"] = {}
            if "user_summaries" not in data:
                data["user_summaries"] = {}
        return data

class TimeWindow(BaseModel):
    """Time window configuration."""
    file: str
    step: str
    label: str
    range: str

    def get_time_range(self, now: datetime) -> Tuple[datetime, datetime]:
        """Get time range for window."""
        end_date = now
        
        # Parse range
        value = int(self.range[1:-1])  # Remove - and d/h
        unit = self.range[-1]
        
        if unit == 'd':
            start_date = end_date - timedelta(days=value)
        elif unit == 'h':
            start_date = end_date - timedelta(hours=value)
        else:
            raise ValueError(f"Invalid range unit: {unit}")
            
        return start_date, end_date

    def get_step_seconds(self) -> int:
        """Get step in seconds."""
        value = int(self.step[:-1])  # Remove unit
        unit = self.step[-1]
        
        if unit == 'd':
            return value * 24 * 60 * 60
        elif unit == 'h':
            return value * 60 * 60
        elif unit == 'm':
            return value * 60
        else:
            raise ValueError(f"Invalid step unit: {unit}") 