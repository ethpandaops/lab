from pathlib import Path
from dotenv import load_dotenv
import os

class Environment:
    def __init__(self):
        # Try to load .env from current and parent directory
        load_dotenv()
        load_dotenv(Path(__file__).parent.parent / '.env')
        load_dotenv(Path(__file__).parent.parent.parent / '.env')
        
        self._pandaops_clickhouse_url = os.getenv('PANDAOPS_CLICKHOUSE_URL')

    def validate(self):
        required_vars = {
            'PANDAOPS_CLICKHOUSE_URL': self.pandaops_clickhouse_url,
        }
        
        missing = [k for k, v in required_vars.items() if not v]
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")

    @property 
    def pandaops_clickhouse_url(self) -> str:
        return self._pandaops_clickhouse_url
