"""Application configuration initialisation.

Loads settings and configures structured logging for the entire service.
"""

import sys

from loguru import logger

from app.core.settings import Settings

settings = Settings()

logger.remove()
logger.add(
    sys.stderr,
    level=settings.LOG_LEVEL,
    format=(
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> - "
        "<level>{message}</level>"
    ),
    colorize=True,
)
