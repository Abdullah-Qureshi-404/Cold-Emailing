import logging
import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.campaigns import router as campaigns_router
from api.leads import router as leads_router
from api.tasks import router as tasks_router
from api.unsubscribe import router as unsubscribe_router

logger = logging.getLogger(__name__)

# Optional error monitoring: needs your own Sentry account/DSN + the
# `sentry-sdk` package (not installed here) — left as an explicit,
# ready-to-activate stub rather than faking an integration.
#   1. pip install sentry-sdk
#   2. Set SENTRY_DSN in backend/.env
#   3. Uncomment the sentry_sdk.init(...) block below
if os.getenv("SENTRY_DSN"):
    logger.warning(
        "SENTRY_DSN is set, but sentry-sdk is not installed — "
        "run `pip install sentry-sdk` and uncomment the init in backend/main.py to enable error tracking."
    )
    # import sentry_sdk
    # sentry_sdk.init(dsn=os.getenv("SENTRY_DSN"), traces_sample_rate=0.2)

app = FastAPI()


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """
    Catches anything that isn't already an HTTPException/validation error so
    a raw Python exception (file paths, library internals, DB errors) never
    reaches the client. Full detail is logged server-side only.
    """
    logger.exception("Unhandled error on %s %s: %s", request.method, request.url.path, exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Something went wrong on our end. Please try again."},
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    # Deliberately-raised HTTPExceptions (404s, validation, etc.) already carry
    # a safe, intentional message — pass them through unchanged.
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"detail": "Invalid request data.", "errors": exc.errors()})

# Dev-friendly by default (any localhost/127.0.0.1 port); override in prod via env.
CORS_ORIGIN_REGEX = os.getenv(
    "CORS_ORIGIN_REGEX", r"http://(localhost|127\.0\.0\.1):\d+"
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)


# Schema is managed by Alembic migrations (see backend/alembic/) — run
# `alembic upgrade head` before starting the server instead of relying on
# create_all(), which cannot evolve an existing schema.


app.include_router(
    campaigns_router,
    prefix="/campaigns"
)

app.include_router(
    leads_router,
    prefix="/leads"
)

app.include_router(
    tasks_router,
    prefix="/tasks"
)

app.include_router(
    unsubscribe_router,
    prefix="/unsubscribe"
)


@app.get("/")
def root():
    return {
        "message": "Cold Email Platform Running"
    }