"""Data models for the beacon chain timings module."""
from typing import Dict, List
from pydantic import BaseModel

class TimingData(BaseModel):
    """Timing data model."""
    timestamps: List[int]
    mins: List[float]
    maxs: List[float]
    avgs: List[float]
    p05s: List[float]
    p50s: List[float]
    p95s: List[float]
    blocks: List[int]

class SizeCDFData(BaseModel):
    """Size CDF data model."""
    sizes_kb: List[int]
    arrival_times_ms: Dict[str, List[float]]

class DataTypeState(BaseModel):
    """State for a specific data type."""
    last_processed: Dict[str, str] = {}  # network/window -> timestamp

class ModuleState(BaseModel):
    """Module state model."""
    block_timings: DataTypeState = DataTypeState()
    size_cdf: DataTypeState = DataTypeState() 