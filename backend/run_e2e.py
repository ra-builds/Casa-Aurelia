"""Disposable E2E backend launcher for Playwright tests (QA-3A).

Starts the real Casa Aurelia FastAPI application against a throwaway SQLite
database so browser E2E tests NEVER touch the development database
(backend/casa_aurelia.db). The admin user is seeded from the environment on
every launch; login rate limiting is disabled (repeat sign-ins are expected).

Usage:
    python run_e2e.py --port 8000

Required environment (NO defaults — credentials are never baked into source):
    E2E_ADMIN_EMAIL     admin login email to seed into the disposable DB
    E2E_ADMIN_PASSWORD  admin login password to seed into the disposable DB

Optional environment:
    E2E_SECRET_KEY      signing secret (random, freshly generated per run when
                        omitted)
    E2E_DB_PATH         explicit database file path (default: fresh file inside a
                        new system temp directory)
    E2E_CORS_ORIGINS    comma-separated CORS origins (default:
                        http://localhost:5174 — the Playwright frontend)
    E2E_FRONTEND_PORT   frontend dev port used to build the default CORS origin
"""

import argparse
import os
import secrets
import sys
import tempfile
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))


def die(message: str) -> None:
    print(f"[run_e2e] ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def main() -> None:
    parser = argparse.ArgumentParser(description="Disposable E2E backend (QA-3A)")
    parser.add_argument("--host", default="127.0.0.1", help="bind address (default 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="bind port (default 8000 = Vite proxy target)")
    args = parser.parse_args()

    admin_email = os.environ.get("E2E_ADMIN_EMAIL", "").strip().lower()
    admin_password = os.environ.get("E2E_ADMIN_PASSWORD", "")
    if not admin_email or not admin_password:
        die(
            "E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD must be set "
            "(no default credentials are ever used)."
        )
    if len(admin_password) < 8:
        die("E2E_ADMIN_PASSWORD must be at least 8 characters (backend validation).")

    # --- Disposable database & upload dir (never backend/casa_aurelia.db) ---
    db_path_env = os.environ.get("E2E_DB_PATH", "").strip()
    if db_path_env:
        target = Path(db_path_env)
        if target.suffix.lower() == ".db":
            db_path = target
            workspace = target.parent
        else:
            db_path = target / "e2e.db"
            workspace = target
    else:
        workspace = Path(tempfile.mkdtemp(prefix="casaaurelia-e2e-"))
        db_path = workspace / "e2e.db"
    workspace.mkdir(parents=True, exist_ok=True)
    upload_dir = workspace / "uploads"
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Fresh deterministic database per run (drop any stale WAL/shm from a
    # previous run that reused the same path).
    for suffix in ("", "-wal", "-shm"):
        stale = Path(str(db_path) + suffix)
        if stale.exists():
            stale.unlink()

    db_url = f"sqlite:///{(db_path).as_posix()}"

    # --- Sandbox environment: set BEFORE any app module import (settings are
    # cached with lru_cache and the .env file has lower precedence) ---
    frontend_port = os.environ.get("E2E_FRONTEND_PORT", "5174")
    os.environ.update(
        {
            "APP_ENV": "development",  # allow create_all on startup (dev-only path)
            "DATABASE_URL": db_url,
            "SECRET_KEY": os.environ.get("E2E_SECRET_KEY") or secrets.token_urlsafe(48),
            "ADMIN_EMAIL": admin_email,
            "ADMIN_PASSWORD": admin_password,
            "UPLOAD_DIR": str(upload_dir),
            "AUTH_COOKIE_SECURE": "false",  # HttpOnly refresh cookie over plain HTTP
            "CORS_ORIGINS": os.environ.get(
                "E2E_CORS_ORIGINS", f"http://localhost:{frontend_port}"
            ),
        }
    )

    # Email safety: the E2E backend must NEVER send real emails. Explicitly
    # force SMTP off regardless of any .env the process working directory may
    # load, so confirmation "delivery" stays a deterministic no-op
    # (email_enabled False -> reservation creates report email_sent false).
    os.environ.update(
        {
            "SMTP_HOST": "",
            "SMTP_USERNAME": "",
            "SMTP_PASSWORD": "",
            "SMTP_FROM": "no-reply@e2e.invalid",
            "NOTIFICATION_RECIPIENTS": "",
        }
    )

    # --- Reuse the exact production seeding path (admin, menu, restaurant) ---
    import seed as seed_module

    seed_module.seed()

    # --- The real application, with rate limiting disabled (as in tests) ---
    from app.main import app

    app.state.limiter.enabled = False

    print(f"[run_e2e] E2E backend on http://{args.host}:{args.port}", flush=True)
    print(f"[run_e2e] disposable DB: {db_path}", flush=True)
    print(f"[run_e2e] seeded admin: {admin_email}", flush=True)
    print("[run_e2e] rate limiting disabled for E2E", flush=True)

    import uvicorn

    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()