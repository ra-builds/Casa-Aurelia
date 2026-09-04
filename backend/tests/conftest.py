"""Pytest fixtures for the Casa Aurelia backend.

All tests run against an ISOLATED temporary SQLite database. The real
development database (casa_aurelia.db) is never touched, and no test requires
a running dev/production server.

Environment variables are set here, before any app module is imported, so that
app.db.database builds its engine against the temporary file rather than the
development database.
"""

import os
import tempfile
from pathlib import Path

import pytest

# --- Isolated environment (must be set BEFORE importing app modules) ---
TEST_DIR = Path(tempfile.mkdtemp(prefix="casaaurelia_tests_"))
TEST_DB_PATH = TEST_DIR / "test.db"
TEST_UPLOADS = TEST_DIR / "uploads"

os.environ["DATABASE_URL"] = f"sqlite:///{TEST_DB_PATH}"
os.environ["SECRET_KEY"] = "test-secret-key-that-is-long-enough-0123456789"
os.environ["ADMIN_EMAIL"] = "admin@test.it"
os.environ["ADMIN_PASSWORD"] = "test-admin-password-123"
os.environ["UPLOAD_DIR"] = str(TEST_UPLOADS)
os.environ["CORS_ORIGINS"] = "http://localhost:5173"
# Test client runs over plain HTTP, so the Secure refresh-token cookie must be
# disabled for the cookie jar to store/send it (mirrors a dev environment).
os.environ["AUTH_COOKIE_SECURE"] = "false"

# Import app modules only now that the environment is pinned to the temp DB.
from fastapi.testclient import TestClient  # noqa: E402

from app.core.config import get_settings  # noqa: E402
from app.core.security import get_password_hash  # noqa: E402
from app.db.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.restaurant import Restaurant  # noqa: E402
from app.models.user import User  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def _isolated_db():
    """Create the schema and seed minimal reference data once per test run."""
    Base.metadata.create_all(bind=engine)
    # Disable slowapi rate limiting during tests so the fast test client is not
    # throttled into 429 responses. Rate-limit *behaviour* is not a target of
    # these tests; the limit configuration is reviewed separately.
    app.state.limiter.enabled = False
    db = SessionLocal()
    try:
        # Restaurant with default capacity (tests that need a specific capacity
        # override it on their own).
        if db.query(Restaurant).first() is None:
            db.add(Restaurant(
                name="Casa Aurelia Test",
                tagline="t", address="Via 1", city="Novara", country="IT",
                phone="+39 0321 123456", email="info@test.it", currency="EUR",
                lunch_hours="12:00 - 14:00", dinner_hours="19:00 - 22:00",
                closed_day="Monday", capacity=40,
            ))
        # Single admin user used by auth tests.
        if db.query(User).filter(User.email == get_settings().admin_email).first() is None:
            db.add(User(
                email=get_settings().admin_email,
                hashed_password=get_password_hash(get_settings().admin_password),
                full_name="Test Admin",
                is_active=True,
                role="admin",
            ))
        db.commit()
    finally:
        db.close()
    yield
    # Teardown: close engine and remove the temporary database + uploads.
    engine.dispose()
    for suffix in ("", "-shm", "-wal"):
        p = Path(str(TEST_DB_PATH) + suffix)
        if p.exists():
            p.unlink()


@pytest.fixture(scope="session")
def client():
    """A TestClient driving the FastAPI app against the isolated DB."""
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def clean_restaurant(db_session):
    """Reset restaurant capacity to a known value and clear active reservations.

    Tests that mutate reservation state call this (or set capacity directly) so
    they start from a deterministic baseline. Scope is function by default.
    """
    from app.models.reservation import Reservation
    db_session.query(Reservation).delete()
    db_session.commit()
    return db_session


@pytest.fixture(scope="session")
def admin_token(client):
    resp = client.post("/api/auth/login", json={
        "email": get_settings().admin_email,
        "password": get_settings().admin_password,
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]
