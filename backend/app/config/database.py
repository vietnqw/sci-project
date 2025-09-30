from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool

from app.config.settings import settings
from app.core.logging import get_logger


logger = get_logger(__name__)


# Create async engine (the main database connection)
_is_test_db = settings.POSTGRES_DB.endswith("_test")
if _is_test_db:
    engine = create_async_engine(
        url=settings.POSTGRES_URL,
        poolclass=NullPool,
        echo=False,
    )
else:
    engine = create_async_engine(
        url=settings.POSTGRES_URL,
        pool_size=settings.POSTGRES_POOL_SIZE,
        max_overflow=settings.POSTGRES_MAX_OVERFLOW,
        pool_timeout=settings.POSTGRES_POOL_TIMEOUT,
        pool_recycle=settings.POSTGRES_POOL_RECYCLE,
        echo=False,  # whether to show SQL query in logs
    )

# Create session factory (to manage database sessions)
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Get database session for FastAPI dependency injection.
    This is what your API endpoints will use
    """

    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            logger.error(f"Database error: {e}")
            await session.rollback()  # undo changes on error
            raise
        finally:
            await session.close()


async def dispose_engine() -> None:
    """Dispose of database engine and close all connections"""

    try:
        await engine.dispose()
        logger.info("Database engine disposed sucessfully")
    except Exception as e:
        logger.error(f"Error disposing datbase engine: {e}")
        raise
