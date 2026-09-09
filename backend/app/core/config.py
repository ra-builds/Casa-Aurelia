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
    # Comma-separated allow-list of HTTP Host header values the app answers to
    # (TrustedHostMiddleware). Empty in development -> the local development
    # hosts are allowed (see trusted_host_list). REQUIRED in production: the app
    # refuses to boot there without an explicit non-empty value (no "*" fallback).
    allowed_hosts: str = ""
    restaurant_capacity: int = 40
    upload_dir: str = "uploads"
    max_upload_size_mb: int = 5

    # --- Email / SMTP (communication layer — post-roadmap hardening) ---
    # All email configuration and secrets come from the environment (never
    # hard-coded or committed). When SMTP is not configured, the app runs without
    # sending email: communication is honestly reported as not-delivered rather
    # than silently pretending to send.
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_use_tls: bool = False  # implicit TLS (SMTPS) on connect
    smtp_starttls: bool = True  # upgrade the connection via STARTTLS
    smtp_from: str = "no-reply@casaaurelia.it"
    smtp_from_name: str = "Casa Aurelia"
    # Comma-separated owner/restaurant notification recipients (reservation and
    # contact-form notifications). Falls back to the seeded restaurant email when
    # empty (see email_service).
    notification_recipients: str = ""

    # --- Auth / refresh-token cookie (P1 hardening) ---
    # The refresh token is delivered as an HttpOnly cookie (never exposed to
    # JavaScript) and the access token is kept in memory only on the client.
    # `auth_cookie_secure` must be True over HTTPS; in local/development HTTP it
    # is set False so the cookie works without TLS. SameSite=Lax is safe because
    # the frontend and API share an origin (dev via the Vite proxy, production
    # via the reverse proxy).
    auth_cookie_secure: bool = True
    auth_cookie_name: str = "casaaurelia_refresh"
    auth_cookie_samesite: str = "lax"
    auth_cookie_path: str = "/api/auth"

    @property
    def refresh_token_cookie_max_age(self) -> int:
        return self.refresh_token_expire_days * 24 * 60 * 60

    @property
    def notification_recipient_list(self) -> list[str]:
        return [r.strip() for r in self.notification_recipients.split(",") if r.strip()]

    @property
    def email_enabled(self) -> bool:
        """True only when SMTP is fully configured (host + username + password)."""
        return bool(self.smtp_host and self.smtp_username)

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

    @property
    def trusted_host_list(self) -> list[str]:
        """Hosts the app is allowed to answer for (TrustedHostMiddleware).

        Parses the comma-separated ALLOWED_HOSTS value. When it is empty, every
        NON-production environment falls back to the local development hosts
        (localhost, the loopback IP and the pytest client host "testserver") so
        local workflows and the isolated test suite keep working. Production
        never gets a fallback: an empty ALLOWED_HOSTS there is rejected at boot
        (see the production guard below) instead of silently meaning "*".
        """
        explicit = [host.strip().lower() for host in self.allowed_hosts.split(",") if host.strip()]
        if explicit:
            return explicit
        return ["localhost", "127.0.0.1", "testserver"]

    @model_validator(mode="after")
    def _reject_placeholder_production_secrets(self):
        # Production boot guards (P1 + P2-0B hardening). In production the app
        # MUST refuse to start while any security-sensitive required setting is
        # still a known placeholder/default (e.g. the values shipped in
        # .env.production.example), or while ALLOWED_HOSTS is missing entirely
        # (an explicit host allow-list is mandatory in production).
        # Development and test environments are explicitly NOT subject to this
        # guard so local workflows keep working.
        #
        # The check never logs or returns the secret values — it only reports
        # WHICH setting is a placeholder/missing by name, never its value.
        if self.app_env != "production":
            return self

        placeholders = (
            "replace_with",
            "changeme",
            "change-me",
            "change_me",
            "your_secret",
            "your-password",
            "secret",
        )
        insecure = [
            name
            for name, value in (
                ("SECRET_KEY", self.secret_key),
                ("ADMIN_PASSWORD", self.admin_password),
            )
            if not value or value.lower() in placeholders or "replace_with" in value.lower()
        ]
        if not self.allowed_hosts.strip():
            insecure.append("ALLOWED_HOSTS")
        if insecure:
            raise ValueError(
                "Refusing to start in production: the following required production "
                f"setting(s) are missing or still placeholder/default values and must "
                f"be set in the environment: {', '.join(insecure)}. No secret values "
                "are logged."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
