from pathlib import Path
import clickhouse_driver
import logging
from lib.config import Config
from lib.environment import Environment
from lib.data import get_data_writer
from sqlalchemy import create_engine

class Lab:
    def __init__(self, notebook_name: str, location: str = "config.yaml"):
        self.notebook_name = notebook_name
        self.env = Environment()
        self.config = Config.from_file(location)
        self.notebook_config = self.config.get_notebook_config(notebook_name)
        self.writer = get_data_writer(self.notebook_config.data_config)
        self.pandaops_clickhouse_client = None
        
        # Setup logging
        self.logger = logging.getLogger(notebook_name)
        self.logger.setLevel(logging.INFO)
        
        # Create handlers if they don't exist
        if not self.logger.handlers:
            # Console handler
            ch = logging.StreamHandler()
            ch.setLevel(logging.INFO)
            
            # Format
            formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
            ch.setFormatter(formatter)
            
            self.logger.addHandler(ch)

    @property
    def log(self):
        """Return logger instance for direct use"""
        return self.logger

    def setup(self):
        """Initialize all components and validate environment"""
        self.env.validate()

    def setup_pandaops_clickhouse(self):
        engine = create_engine(self.env.pandaops_clickhouse_url)
        self.pandaops_clickhouse_client = engine.connect()

    def get_notebook_config(self):
        """Get notebook specific configuration"""
        return self.notebook_config

    def write_json(self, filename: str, data: dict | list):
        """Write data to a JSON file in the notebook's namespace"""
        namespaced_filename = f"{self.notebook_name}/{filename}"
        self.writer.write_json(namespaced_filename, data)

    def delete_directory(self, directory: str):
        """Delete a directory in the notebook's namespace"""
        namespaced_directory = f"{self.notebook_name}/{directory}"
        self.writer.delete_directory(namespaced_directory)

    def get_pandaops_clickhouse_client(self):
        """Get clickhouse client"""
        return self.pandaops_clickhouse_client

    def get_data_writer(self):
        """Get data writer"""
        return self.writer
