import sys
import yaml
from pathlib import Path
from lib.runner import NotebookRunner

def load_config() -> dict:
    """Load configuration from yaml file."""
    config_path = Path("../config.yaml")
    if not config_path.exists():
        raise FileNotFoundError("config.yaml not found")
    
    with open(config_path) as f:
        return yaml.safe_load(f)

if __name__ == "__main__":
    config = load_config()
    
    if len(sys.argv) < 2:
        # No notebook specified, run all enabled notebooks
        NotebookRunner.run_all(config)
    else:
        # Run specific notebook
        notebook_path = sys.argv[1]
        try:
            runner = NotebookRunner(notebook_path, config)
            runner.run()
        except ValueError as e:
            print(f"Error: {str(e)}")
            sys.exit(1) 