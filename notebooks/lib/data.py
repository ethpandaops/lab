from pathlib import Path
import json
from typing import Any, Protocol, Dict, Union, Literal
from abc import abstractmethod
from dataclasses import dataclass

@dataclass
class DataConfig:
    type: Literal["fs"]  # Will add "s3" later
    path: str

class DataWriter(Protocol):
    """Protocol for data writers"""
    @abstractmethod
    def write_json(self, path: str, data: Any) -> None:
        """Write data to JSON file"""
        pass

    @abstractmethod
    def write_jsonl(self, path: str, data: list[Dict[str, Any]]) -> None:
        """Write data to JSONL file"""
        pass

class FSDataWriter:
    """Filesystem data writer"""
    def __init__(self, config: DataConfig):
        self.base_path = Path(config.path)
        self.base_path.mkdir(parents=True, exist_ok=True)

    def write_json(self, path: str, data: Any) -> None:
        """Write data to JSON file"""
        full_path = self.base_path / path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, 'w') as f:
            json.dump(data, f)

    def write_jsonl(self, path: str, data: list[Dict[str, Any]]) -> None:
        """Write data to JSONL file"""
        full_path = self.base_path / path
        full_path.parent.mkdir(parents=True, exist_ok=True)
        with open(full_path, 'w') as f:
            for item in data:
                f.write(json.dumps(item) + '\n')
    def delete_directory(self, path: str) -> None:
        """Delete a directory and all its contents"""
        import shutil
        full_path = self.base_path / path
        if full_path.exists():
            shutil.rmtree(full_path)

def get_data_writer(config: DataConfig) -> DataWriter:
    """Get data writer based on config type"""
    if config.type == "fs":
        return FSDataWriter(config)
    
    raise ValueError(f"Unsupported data writer type: {config.type}")

# Example usage:
# config = DataConfig(type="fs", path=xatu_config.data_dir)
# writer = get_data_writer(config)
# writer.write_json('top_client_versions.json', versions_data)
# writer.write_jsonl('events.jsonl', events_data) 