from pathlib import Path
from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

# Root of the backend package (…/backend). All relative file settings are
# resolved against this path so that the app behaves identically regardless of
# the process working directory (e.g. systemd/uWSGI launch, cron, tests).
BACKEND_ROOT = Path(__file__).resolve().parent.parent.parent


class Settings(BaseSettings):
    app_env: str = "development"
    database_url: str = "sqlite:///./casa_aurelia.db"
    secret_key: str = Field(..., min_length=32)
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    admin_email: str = "admin@casaaurelia.it"
    admin_password: str = Field(..., min_length=8)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    restaurant_capacity: int = 40
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 5

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @model_validator(mode="after")
    def _resolve_relative_paths(self):
        # Resolve a bare/relative sqlite filename to an absolute path anchored
        # at the backend root (…/backend/casa_aurelia.db). Absolute paths,
        # in-memory URLs and bare "sqlite://" are left untouched.
        prefix = "sqlite:///"
        if self.database_url.startswith(prefix) and self.database_url != "sqlite://":
            rel = Path(self.database_url[len(prefix):])
            if not rel.is_absolute() and str(rel) not in (":memory:", ""):
                self.database_url = f"sqlite:///{(BACKEND_ROOT / rel).as_posix()}"
        # Make upload_dir absolute, anchored at the backend root.
        if self.upload_dir and not Path(self.upload_dir).is_absolute():
            self.upload_dir = str(BACKEND_ROOT / self.upload_dir)
        return self

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
