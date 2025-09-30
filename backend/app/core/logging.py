import logging
import sys
from pathlib import Path

from loguru import logger


# Configuration
LOG_LEVELS = {
    "TRACE": {"color": "<dim><white>"},
    "DEBUG": {"color": "<blue>"},
    "INFO": {"color": "<green>"},
    "SUCCESS": {"color": "<bold><green>"},
    "WARNING": {"color": "<yellow>"},
    "ERROR": {"color": "<red>"},
    "CRITICAL": {"color": "<bold><red>"},
}

CONSOLE_LOG_FORMAT = (
    "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
    "<level>{level: <8}</level> | "
    "<cyan>{name}:{function}:{line}</cyan> - <level>{message}</level>"
)

FILE_LOG_FORMAT = (
    "{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {name}:{function}:{line} - {message}"
)

LOGGERS_TO_INTERCEPT = [
    "uvicorn",
    "uvicorn.access",
    "uvicorn.error",
    "fastapi",
    "asyncio",
    "starlette",
    "httpx",
    "sqlalchemy",
]


# Intercept handler
class InterceptHandler(logging.Handler):
    """
    Custom handler that intercepts Python standard logging and redirects to Loguru
    """

    def emit(self, record: logging.LogRecord) -> None:
        """Emit a log record by redirecting to Loguru"""

        # Get corresponding Loguru level
        try:
            level = logger.level(record.levelname).name
        except ValueError:
            level = record.levelno

        # Find caller to get correct stack depth
        frame, depth = logging.currentframe(), 2
        while frame and frame.f_back and frame.f_code.co_filename == logging.__file__:
            frame = frame.f_back
            depth += 1

        logger.opt(depth=depth, exception=record.exc_info).log(
            level, record.getMessage()
        )


def setup_logging(
    log_level: str = "INFO",
    log_file: str = "logs/app.log",
    environment: str = "local",
):
    """
    Configure unified logging using Loguru

    Args:
        log_level: Minimum log level to capture
        log_file: Path to log file for production
        environment: if "local", disables file logging and enqueue for development
    """

    # Clear any existing handlers
    logging.root.handlers.clear()
    try:
        logger.remove()
    except ValueError:
        pass  # No handlers to remove

    # Configure custom colors
    for name, config in LOG_LEVELS.items():
        logger.level(name=name, color=config["color"])

    # Add console handler
    logger.add(
        sys.stdout,
        level=log_level,
        format=CONSOLE_LOG_FORMAT,
        colorize=True,
        backtrace=True,
        diagnose=True,
        enqueue=False,
    )

    # Add file handler for production mode
    if environment == "production":
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        logger.add(
            log_file,
            level=log_level,
            format=FILE_LOG_FORMAT,
            rotation="500 MB",
            retention="10 days",
            compression="zip",
            colorize=False,
            backtrace=True,
            diagnose=True,
            enqueue=True,
        )

    # Intercept and redirect standard Python logging to Loguru
    logging.basicConfig(handlers=[InterceptHandler()], level=logging.NOTSET, force=True)

    for logger_name in LOGGERS_TO_INTERCEPT:
        logging_logger = logging.getLogger(logger_name)
        logging_logger.handlers.clear()
        logging_logger.propagate = True


def get_logger(name: str = __name__):
    """
    Get a Loguru logger instance.

    Args:
        name: Logger name (usually __name__)

    Returns:
        Loguru logger instance
    """

    return logger.bind(name=name)
