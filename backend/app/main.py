from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from sqlalchemy import text

from app.api.routers import auth, menu, reservations, restaurant
from app.core.config import get_settings
from app.db.database import init_db, SessionLocal
from app.services.image_service import ensure_upload_dirs

settings = get_settings()
ensure_upload_dirs()

# Security headers applied to every FastAPI-served response (API + static uploads).
# Values are safe for API/upload responses. A Content-Security-Policy is intentionally
# NOT set here: it must live on the HTML document served by the frontend deployment
# (see Phase 8A report, "Deferred Production Requirements"), not on JSON/static-upload
# responses where it would be ineffective.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Casa Aurelia API",
    description="Restaurant website and reservation API",
    version="1.0.0",
    lifespan=lifespan,
)

app.state.limiter = reservations.limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    for key, value in SECURITY_HEADERS.items():
        if value is not None:
            response.headers.setdefault(key, value)
    return response

app.include_router(auth.router)
app.include_router(reservations.router)
app.include_router(menu.router)
app.include_router(menu.admin_router)
app.include_router(restaurant.router)

app.mount(
    "/uploads",
    StaticFiles(directory=str(Path(settings.upload_dir).resolve())),
    name="uploads",
)


@app.get("/api/health")
def health_check():
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "healthy", "service": "Casa Aurelia API", "database": "connected"}
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "service": "Casa Aurelia API", "database": "disconnected"},
        )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred. Please try again later."},
    )
