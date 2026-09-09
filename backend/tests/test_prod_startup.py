"""Production startup guard regression tests (isolated).

A fresh schema must never be auto-created at application startup when
APP_ENV=production: Alembic owns the production schema. These tests launch a
subprocess (so app settings are rebuilt from an isolated environment) against a
temporary SQLite database and assert that startup creates no tables at all,
while the health endpoint still works on an empty database.
"""

import os
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PYTHON = sys.executable


def _probe(probe_body: str, db_path: Path, *, secret_key: str = "prod-probe-secret-0123456789abcdefgh", admin_password: str = "probe-admin-password-125") -> tuple[int, str, str]:
    """Run a subprocess with APP_ENV=production against an isolated database."""
    with tempfile.TemporaryDirectory(prefix="casaaurelia_prod_probe_") as td:
        probe = Path(td) / "probe.py"
        uploads_dir = (Path(td) / "uploads").as_posix()
        header = "\n".join(
            [
                "import os",
                'os.environ["APP_ENV"] = "production"',
                f'os.environ["DATABASE_URL"] = "sqlite:///{db_path.as_posix()}"',
                f'os.environ["SECRET_KEY"] = {secret_key!r}',
                'os.environ["ADMIN_EMAIL"] = "admin@probe.it"',
                f'os.environ["ADMIN_PASSWORD"] = {admin_password!r}',
                f'os.environ["UPLOAD_DIR"] = {uploads_dir!r}',
                'os.environ["CORS_ORIGINS"] = "http://localhost:5173"',
                # TrustedHostMiddleware (P2-0B): production requires an explicit
                # ALLOWED_HOSTS. The probe drives the app via TestClient, whose
                # Host header is "testserver".
                'os.environ["ALLOWED_HOSTS"] = "testserver"',
                'os.environ.pop("RESTAURANT_CAPACITY", None)',
            ]
        )
        probe.write_text(header + "\n\n" + probe_body, encoding="utf-8")
        env = os.environ.copy()
        for key in ("DATABASE_URL", "SECRET_KEY", "UPLOAD_DIR", "CORS_ORIGINS", "APP_ENV", "ALLOWED_HOSTS"):
            env.pop(key, None)
        env["PYTHONPATH"] = str(BACKEND_DIR)
        result = subprocess.run(
            [PYTHON, str(probe)],
            cwd=str(BACKEND_DIR),
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )
        return result.returncode, result.stdout, result.stderr


def test_production_startup_does_not_create_tables():
    with tempfile.TemporaryDirectory(prefix="casaaurelia_prod_db_") as td:
        db_path = Path(td) / "prod.db"
        code, out, err = _probe(
            textwrap.dedent(
                f"""
                import sqlite3
                from fastapi.testclient import TestClient
                from app.main import app
                with TestClient(app) as client:
                    r = client.get("/api/health")
                    print("HEALTH", r.status_code, r.json().get("status"))
                con = sqlite3.connect({db_path.as_posix()!r})
                tables = con.execute(
                    "SELECT name FROM sqlite_master WHERE type IN ('table','view') "
                    "AND name NOT LIKE 'sqlite_%'"
                ).fetchall()
                con.close()
                print("TABLES", sorted(t for (t,) in tables))
                """
            ),
            db_path,
        )
        assert code == 0, f"probe exited {code}\nSTDOUT:\n{out}\nSTDERR:\n{err}"
        assert "HEALTH 200 healthy" in out, out
        assert "TABLES []" in out, out


def test_production_boots_with_real_secrets():
    """With real (non-placeholder) secrets, production startup succeeds."""
    with tempfile.TemporaryDirectory(prefix="casaaurelia_prod_db_") as td:
        db_path = Path(td) / "prod.db"
        code, out, err = _probe(
            "from fastapi.testclient import TestClient\n"
            "from app.main import app\n"
            "with TestClient(app):\n"
            "    print('BOOTED')\n",
            db_path,
        )
        assert code == 0, f"probe exited {code}\nSTDOUT:\n{out}\nSTDERR:\n{err}"
        assert "BOOTED" in out, out


def test_production_rejects_placeholder_secret_key():
    """A placeholder SECRET_KEY must refuse to boot in production (P1-2).

    Asserts the guard names the offending setting (SECRET_KEY) but NEVER echoes
    the actual placeholder value back into the output.
    """
    placeholder = "replace_with_a_long_random_secret"
    with tempfile.TemporaryDirectory(prefix="casaaurelia_prod_db_") as td:
        db_path = Path(td) / "prod.db"
        code, out, err = _probe(
            "from fastapi.testclient import TestClient\n"
            "from app.main import app\n"
            "print('UNREACHABLE')\n",
            db_path,
            secret_key=placeholder,
        )
        assert code != 0, f"production boot should have failed, but exited {code}\n{out}\n{err}"
        combined = out + err
        assert "SECRET_KEY" in combined
        assert placeholder not in combined, "guard must not echo the secret value"
        assert "UNREACHABLE" not in combined


def test_production_rejects_placeholder_admin_password():
    """A placeholder ADMIN_PASSWORD must refuse to boot in production (P1-2)."""
    placeholder = "replace_with_admin_password"
    with tempfile.TemporaryDirectory(prefix="casaaurelia_prod_db_") as td:
        db_path = Path(td) / "prod.db"
        code, out, err = _probe(
            "from fastapi.testclient import TestClient\n"
            "from app.main import app\n"
            "print('UNREACHABLE')\n",
            db_path,
            admin_password=placeholder,
        )
        assert code != 0, f"production boot should have failed, but exited {code}\n{out}\n{err}"
        combined = out + err
        assert "ADMIN_PASSWORD" in combined
        assert placeholder not in combined, "guard must not echo the secret value"
        assert "UNREACHABLE" not in combined