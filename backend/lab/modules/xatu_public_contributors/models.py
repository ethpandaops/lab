"""Models for Xatu Public Contributors module."""
from typing import Dict

from pydantic import BaseModel

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

class DataTypeState(BaseModel):
    """State for a data type."""
    last_processed: Dict[str, str] = {}

class ModuleState(BaseModel):
    """Module state model."""
    summary: DataTypeState = DataTypeState() 