import os
import sys
import yaml
from datetime import datetime
from pathlib import Path
import papermill as pm

class NotebookRunner:
    METADATA_FILE = Path("data/metadata.yaml")

    @classmethod
    def run_all(cls, config: dict):
        """Run all enabled notebooks from config."""
        notebooks = config.get("notebooks", {})
        notebook_dir = Path(".")
        
        for notebook_name, notebook_config in notebooks.items():
            if not notebook_config.get("enabled", False):
                print(f"Skipping {notebook_name} - disabled in config")
                continue
                
            notebook_path = notebook_dir / f"{notebook_name}.ipynb"
            if not notebook_path.exists():
                print(f"Skipping {notebook_name} - notebook file not found")
                continue
                
            try:
                runner = cls(str(notebook_path), config)
                runner.run()
            except Exception as e:
                print(f"Error running {notebook_name}: {str(e)}")
                sys.exit(1)  # Exit on first error

    @classmethod
    def _load_metadata(cls) -> dict:
        """Load metadata from YAML file."""
        if not cls.METADATA_FILE.exists():
            return {}
        
        with open(cls.METADATA_FILE) as f:
            return yaml.safe_load(f) or {}

    @classmethod
    def _save_metadata(cls, metadata: dict):
        """Save metadata to YAML file."""
        cls.METADATA_FILE.parent.mkdir(exist_ok=True)
        with open(cls.METADATA_FILE, "w") as f:
            yaml.dump(metadata, f)

    def __init__(self, notebook_path: str, config: dict):
        self.notebook_path = Path(notebook_path)
        self.notebook_name = self.notebook_path.stem
        self.config = config.get("notebooks", {}).get(self.notebook_name)
        
        if not self.config:
            raise ValueError(f"No configuration found for notebook: {self.notebook_name}")
        if not self.config.get("enabled", False):
            raise ValueError(f"Notebook {self.notebook_name} is disabled in config")

    def get_last_run_time(self) -> datetime:
        """Get the last run time of a notebook from the metadata file."""
        metadata = self._load_metadata()
        last_run = metadata.get(self.notebook_name, {}).get("last_run")
        
        if not last_run:
            return datetime.fromtimestamp(0)
        
        return datetime.fromisoformat(last_run)

    def update_last_run_time(self):
        """Update the last run time of a notebook in the metadata file."""
        metadata = self._load_metadata()
        metadata[self.notebook_name] = {
            "last_run": datetime.now().isoformat(),
            "notebook": self.notebook_name
        }
        self._save_metadata(metadata)

    def should_run(self) -> bool:
        """Check if enough time has passed since the last run based on config."""
        schedule_hours = self.config["schedule_hours"]
        last_run = self.get_last_run_time()
        hours_since_last_run = (datetime.now() - last_run).total_seconds() / 3600
        return hours_since_last_run >= schedule_hours

    def run(self):
        """Run the notebook if enabled and enough time has passed since last run."""
        if not self.should_run():
            print(f"Skipping {self.notebook_name} - Not enough time has passed since last run")
            return
                
        try:
            print(f"Running {self.notebook_name}")
            # Execute notebook without saving output
            pm.execute_notebook(
                self.notebook_path,
                None,  # Don't save output
            )
            self.update_last_run_time()
            print(f"Notebook {self.notebook_name} executed successfully")
        except Exception as e:
            print(f"Error executing notebook {self.notebook_name}: {str(e)}")