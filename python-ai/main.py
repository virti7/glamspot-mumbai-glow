"""FastAPI application entry point for GlamAI.

Assembles the application with middleware, routes, and lifecycle hooks.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from app.core.config import settings, logger
from app.api.routes import router


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-powered beauty analysis platform",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(
    request: object,
    exc: StarletteHTTPException,
) -> JSONResponse:
    """Handle HTTP exceptions with structured logging."""
    logger.warning(
        "HTTP {status_code} on {path}: {detail}",
        status_code=exc.status_code,
        path=getattr(request, "url", None),
        detail=exc.detail,
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: object,
    exc: RequestValidationError,
) -> JSONResponse:
    """Handle request validation errors with detailed logging."""
    logger.error(
        "Validation error on {path}: {errors}",
        path=getattr(request, "url", None),
        errors=exc.errors(),
    )
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(
    request: object,
    exc: Exception,
) -> JSONResponse:
    """Handle unexpected errors gracefully."""
    logger.opt(exception=exc).error(
        "Unhandled exception on {path}: {exc}",
        path=getattr(request, "url", None),
        exc=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred."},
    )


@app.on_event("startup")
async def startup() -> None:
    """Log application startup."""
    logger.info(
        "Starting {name} v{version}",
        name=settings.APP_NAME,
        version=settings.APP_VERSION,
    )


@app.on_event("shutdown")
async def shutdown() -> None:
    """Log application shutdown."""
    logger.info("Shutting down {name}", name=settings.APP_NAME)
