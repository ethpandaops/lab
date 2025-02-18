"""Main entry point for the Lab backend."""
import argparse
import sys
import asyncio

from lab.core import logger as lab_logger, runner
from lab.core.config import Config

logger = lab_logger.get_logger()

async def amain() -> int:
    """Async main entry point for the application."""
    parser = argparse.ArgumentParser(description="Lab backend")
    parser.add_argument("-d", "--debug", action="store_true", help="Enable debug logging")
    parser.add_argument("-c", "--config", default="config.yaml", help="Path to config file")
    args = parser.parse_args()

    # Configure logging
    lab_logger.configure_logging(debug=args.debug)

    # Log initial configuration
    logger.debug("Starting Lab backend", debug=args.debug)

    # Load config
    logger.debug("Loading config", path=args.config)
    try:
        config = Config.from_yaml(args.config)
        logger.debug("Config loaded successfully")
    except FileNotFoundError:
        logger.error("Config file not found", path=args.config)
        return 1
    except Exception as e:
        logger.error("Failed to load config", path=args.config, error=str(e))
        return 1

    # Create runner
    logger.info("Creating runner")
    runner_instance = runner.Runner(config)

    # Start runner
    logger.info("Starting runner")
    try:
        await runner_instance.start()
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
        return 0
    except Exception as e:
        logger.error("Runner failed", error=str(e))
        return 1

    return 0

def main() -> int:
    """Main entry point for the application."""
    try:
        return asyncio.run(amain())
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt")
        return 0

if __name__ == "__main__":
    sys.exit(main()) 