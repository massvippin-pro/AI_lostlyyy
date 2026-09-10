"""FastAPI application entry point, middleware, exception handlers, and routing."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.core.database import Base, engine
from app.core.logging import logger
from app.schemas.common import ApiResponse
from app.services.report_service import ReportNotFoundError
from app.ai.heuristic_engine import InvalidComparisonError
from app.api.v1 import api_v1_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager for startup and shutdown hooks."""
    logger.info(f"Starting {settings.APP_NAME} v{settings.APP_VERSION} ({settings.ENVIRONMENT})")
    # Automatically create tables if not existing (especially useful for SQLite local development)
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created successfully.")
    except Exception as e:
        logger.error(f"Database schema initialization warning: {e}")
    yield
    logger.info(f"Shutting down {settings.APP_NAME}")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Production-grade Backend for College AI Lost-and-Found Matcher. "
        "Implements an Intelligent Agent with a deterministic, explainable heuristic matching engine "
        "evaluating Category (20%), Color (15%), Location (20%), Time (20%), and Description (25%)."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ------------------------------------------------------------------------------
# CORS Middleware Configuration
# ------------------------------------------------------------------------------
origins = settings.cors_origins_list
allow_all = "*" in origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allow_all else origins,
    allow_credentials=not allow_all,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# Centralized Exception Handlers
# ------------------------------------------------------------------------------
@app.exception_handler(ReportNotFoundError)
async def handle_report_not_found(request: Request, exc: ReportNotFoundError):
    logger.warning(f"Report not found: {exc}")
    payload = ApiResponse.error_response(
        code="REPORT_NOT_FOUND",
        message=str(exc),
        details={"report_id": str(exc.report_id)},
    )
    return JSONResponse(status_code=status.HTTP_404_NOT_FOUND, content=payload.model_dump())


@app.exception_handler(InvalidComparisonError)
async def handle_invalid_comparison(request: Request, exc: InvalidComparisonError):
    logger.warning(f"Invalid comparison attempted: {exc}")
    payload = ApiResponse.error_response(
        code="INVALID_COMPARISON",
        message=str(exc),
    )
    return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content=payload.model_dump())


@app.exception_handler(RequestValidationError)
async def handle_validation_error(request: Request, exc: RequestValidationError):
    logger.warning(f"Request validation error on {request.url.path}: {exc.errors()}")
    clean_errors = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        clean_errors.append({"field": field, "message": err.get("msg", "Invalid value")})

    payload = ApiResponse.error_response(
        code="VALIDATION_ERROR",
        message="Request input validation failed. Please check submitted fields.",
        details=clean_errors,
    )
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=payload.model_dump())


@app.exception_handler(StarletteHTTPException)
async def handle_http_exception(request: Request, exc: StarletteHTTPException):
    logger.warning(f"HTTP {exc.status_code} on {request.url.path}: {exc.detail}")
    payload = ApiResponse.error_response(
        code="HTTP_ERROR",
        message=str(exc.detail),
    )
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.exception_handler(SQLAlchemyError)
async def handle_database_error(request: Request, exc: SQLAlchemyError):
    logger.error(f"Database error occurred on {request.url.path}: {exc}")
    # Never leak internal database schema or connection credentials to clients
    payload = ApiResponse.error_response(
        code="DATABASE_ERROR",
        message="A database error occurred. The operation could not be completed.",
    )
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=payload.model_dump())


@app.exception_handler(Exception)
async def handle_unexpected_error(request: Request, exc: Exception):
    logger.error(f"Unhandled server exception on {request.url.path}: {exc}", exc_info=True)
    # Never expose stack traces or server internals
    payload = ApiResponse.error_response(
        code="INTERNAL_SERVER_ERROR",
        message="An unexpected internal server error occurred.",
    )
    return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content=payload.model_dump())


# ------------------------------------------------------------------------------
# Route Registration
# ------------------------------------------------------------------------------
app.include_router(api_v1_router)


@app.get(
    "/",
    tags=["Root"],
    summary="Root API Info",
    description="Application entry info and links to documentation.",
)
def root_info():
    """Return welcome payload and interactive documentation URLs."""
    return ApiResponse.success_response({
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
        "health_check": "/api/v1/health",
    })
