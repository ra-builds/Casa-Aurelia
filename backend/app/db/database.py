from sqlalchemy import create_engine, event
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.core.config import get_settings

settings = get_settings()

connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

if settings.database_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA busy_timeout=5000")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """Initialize database tables.

    This function is called during application startup for development convenience.
    It uses SQLAlchemy's create_all() which only creates tables that don't exist.
    It does NOT modify existing tables or run migrations.

    IMPORTANT: For production deployments, use Alembic migrations instead:
        alembic upgrade head

    This function is safe to keep because:
    - create_all() is a no-op when tables already exist
    - It doesn't alter schema of existing tables
    - It provides a convenient fallback for local development
    """
    from app.models import category, menu_item, reservation, restaurant, restaurant_setting, user  # noqa: F401

    Base.metadata.create_all(bind=engine)
