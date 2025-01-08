import os
import sys
import json
import yaml
from datetime import datetime
import papermill as pm
from pathlib import Path

def load_config() -> dict:
    """Load configuration from yaml file."""
    config_path = Path("config.yaml")
    if not config_path.exists():
        raise FileNotFoundError("config.yaml not found")
    
    with open(config_path) as f:
        return yaml.safe_load(f)

def get_notebook_config(notebook_name: str) -> dict:
    """Get configuration for a specific notebook."""
    config = load_config()
    notebook_config = config.get("notebooks", {}).get(notebook_name)
    
    if not notebook_config:
        raise ValueError(f"No configuration found for notebook: {notebook_name}")
    if not notebook_config.get("enabled", False):
        raise ValueError(f"Notebook {notebook_name} is disabled in config")
        
    return notebook_config

def get_last_run_time(notebook_name: str) -> datetime:
    """Get the last run time of a notebook from the metadata file."""
    metadata_path = Path("data/.metadata")
    metadata_path.mkdir(exist_ok=True)
    
    metadata_file = metadata_path / f"{notebook_name}.json"
    if not metadata_file.exists():
        return datetime.fromtimestamp(0)
    
    with open(metadata_file) as f:
        data = json.load(f)
        return datetime.fromisoformat(data.get("last_run", "1970-01-01T00:00:00"))

def update_last_run_time(notebook_name: str):
    """Update the last run time of a notebook in the metadata file."""
    metadata_path = Path("data/.metadata")
    metadata_path.mkdir(exist_ok=True)
    
    metadata_file = metadata_path / f"{notebook_name}.json"
    with open(metadata_file, "w") as f:
        json.dump({
            "last_run": datetime.now().isoformat(),
            "notebook": notebook_name
        }, f)

def should_run_notebook(notebook_name: str) -> bool:
    """Check if enough time has passed since the last run based on config."""
    config = get_notebook_config(notebook_name)
    schedule_hours = config["schedule_hours"]
    
    last_run = get_last_run_time(notebook_name)
    hours_since_last_run = (datetime.now() - last_run).total_seconds() / 3600
    return hours_since_last_run >= schedule_hours

def run_notebook(notebook_path: str):
    """Run a notebook if enabled and enough time has passed since last run."""
    notebook_name = Path(notebook_path).stem
    
    try:
        if not should_run_notebook(notebook_name):
            print(f"Skipping {notebook_name} - Not enough time has passed since last run")
            sys.exit(0)
    except ValueError as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
    
    # Ensure DATA_DIR exists
    data_dir = Path("data") / notebook_name
    data_dir.mkdir(exist_ok=True)
    
    # Set environment variables
    os.environ["DATA_DIR"] = str(data_dir)
    
    # Execute notebook
    output_path = Path("notebooks/outputs") / f"{notebook_name}_latest.ipynb"
    output_path.parent.mkdir(exist_ok=True)
    
    pm.execute_notebook(
        notebook_path,
        output_path,
        parameters=dict(
            DATA_DIR=str(data_dir)
        )
    )
    
    update_last_run_time(notebook_name)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python notebook_runner.py <notebook_path>")
        sys.exit(1)
        
    notebook_path = sys.argv[1]
    run_notebook(notebook_path) 