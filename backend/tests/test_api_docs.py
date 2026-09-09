"""API documentation policy regression tests (P2-0B).

Development/test: the interactive docs (/docs, /redoc) and the OpenAPI schema
(/openapi.json) are available.
Production: all three are disabled; GET /api/health remains the health check.
Production assertions run in a subprocess so app settings are rebuilt from an
isolated environment (mirrors test_prod_startup.py).
"""

import os
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
PYTHON = sys.executable


def test_dev_docs_and_openapi_available(client):
    assert client.get("/docs").status_code == 200
    assert client.get("/redoc").status_code == 200
    assert client.get("/openapi.json").status_code == 200


def _production_probe(probe_body: str) -> tuple[int, str, str]:
    """Run a subprocess with APP_ENV=production against an isolated database."""
    with tempfile.TemporaryDirectory(prefix="casaaurelia_docs_probe_") as td:
        db_path = Path(td) / "prod.db"
        probe = Path(td) / "probe.py"
        uploads_dir = (Path(td) / "uploads").as_posix()
        header = "\n".join(
            [
                "import os",
                'os.environ["APP_ENV"] = "production"',
                f'os.environ["DATABASE_URL"] = "sqlite:///{db_path.as_posix()}"',
                'os.environ["SECRET_KEY"] = "prod-docs-probe-secret-0123456789abcdefgh"',
                'os.environ["ADMIN_EMAIL"] = "admin@probe.it"',
                'os.environ["ADMIN_PASSWORD"] = "probe-admin-password-125"',
                f'os.environ["UPLOAD_DIR"] = {uploads_dir!r}',
                'os.environ["CORS_ORIGINS"] = "https://casaaurelia.example"',
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


def test_production_docs_and_openapi_disabled():
    code, out, err = _production_probe(
        textwrap.dedent(
            """
            from fastapi.testclient import TestClient
            from app.main import app
            with TestClient(app) as client:
                print("DOCS", client.get("/docs").status_code)
                print("REDOC", client.get("/redoc").status_code)
                print("OPENAPI", client.get("/openapi.json").status_code)
                print("HEALTH", client.get("/api/health").status_code)
            """
        )
    )
    assert code == 0, f"probe exited {code}\nSTDOUT:\n{out}\nSTDERR:\n{err}"
    assert "DOCS 404" in out, out
    assert "REDOC 404" in out, out
    assert "OPENAPI 404" in out, out
    assert "HEALTH 200" in out, out
