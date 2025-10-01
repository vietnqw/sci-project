from contextlib import asynccontextmanager
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import settings
from app.config.database import dispose_engine
from app.core.logging import setup_logging, get_logger
from app.api.main import api_router
from app.core.errors import APIError, error_payload
from fastapi.responses import JSONResponse


# Setting up unified logging for development
setup_logging(
    log_level=settings.LOG_LEVEL,
    log_file=settings.LOG_FILE,
    environment=settings.ENVIRONMENT,
)
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown"""

    logger.info("🚀 Starting SCI backend...")

    # Startup: Database is ready to use
    yield

    # Shutdown: Cleanup connections
    logger.info("👋 Shutting down SCI backend...")
    await dispose_engine()


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS_LIST,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.API_V1_STR)


@app.exception_handler(APIError)
async def handle_api_error(_request, exc: APIError):  # noqa: ANN001
    return JSONResponse(status_code=exc.http_status, content=error_payload(exc))


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True,
        log_config=None,  # Use our custom logging configuration
        log_level=None,  # Prevent Uvicorn from overriding log level
    )
