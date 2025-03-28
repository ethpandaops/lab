"""Logger configuration for the Lab backend."""
import logging
import sys
from typing import Any, Dict, Optional

_logger: Optional[logging.Logger] = None

class LabLogger(logging.Logger):
    """Custom logger that handles extra parameters."""

    def __init__(self, name: str, level: int = logging.NOTSET):
        """Initialize logger."""
        super().__init__(name, level)
        self._bound_fields = {}

    def _format_value(self, value: Any) -> str:
        """Format a value for logging."""
        if isinstance(value, (tuple, list)):
            return str(value)
        if isinstance(value, dict):
            return str({k: self._format_value(v) for k, v in value.items()})
        return str(value)

    def _log(self, level: int, msg: str, args: tuple, exc_info: Any = None, extra: Dict[str, Any] = None, **kwargs: Any) -> None:
        """Override _log to handle extra parameters."""
        if extra is None:
            extra = {}
        if kwargs:
            extra.update(kwargs)
        if self._bound_fields:
            extra.update(self._bound_fields)

        if extra:
            msg = f"{msg} {' '.join(f'{k}={self._format_value(v)}' for k, v in extra.items())}"
        super()._log(level, msg, args, exc_info, extra=None)

    def bind(self, **kwargs: Any) -> 'LabLogger':
        """Create a new logger with bound fields."""
        new_logger = LabLogger(self.name, self.level)
        new_logger._bound_fields = {**self._bound_fields, **kwargs}
        return new_logger

def configure_logging(debug: bool = False) -> None:
    """Configure logging for the application."""
    global _logger

    # Set logging level
    level = logging.DEBUG if debug else logging.INFO

    # Register our custom logger class
    logging.setLoggerClass(LabLogger)

    # Configure root logger
    root_logger = logging.getLogger()
    
    # Remove any existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Add stdout handler with simple format
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt='%(asctime)s [%(levelname)-8s] [%(name)s] %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    handler.setFormatter(formatter)
    handler.setLevel(level)
    root_logger.addHandler(handler)
    root_logger.setLevel(level)

    # Set boto3 and urllib3 to only show WARNING and above
    logging.getLogger('boto3').setLevel(logging.WARNING)
    logging.getLogger('botocore').setLevel(logging.WARNING)
    logging.getLogger('urllib3').setLevel(logging.WARNING)
    logging.getLogger('s3transfer').setLevel(logging.WARNING)

    # Create logger instance
    _logger = logging.getLogger("lab")
    _logger.debug("Logging configured", debug=debug)

def get_logger(name: Optional[str] = None) -> logging.Logger:
    """Get the configured logger instance."""
    if _logger is None:
        configure_logging()
    if name is None:
        return _logger
    return logging.getLogger(name) 