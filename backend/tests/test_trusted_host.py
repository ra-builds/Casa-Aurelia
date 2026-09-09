"""TrustedHostMiddleware allow-list regression tests (P2-0B).

Non-production: localhost, 127.0.0.1 and the pytest client host (testserver)
are allowed; any other Host header is rejected with 400.
Production: an explicit ALLOWED_HOSTS is REQUIRED at boot (no wildcard
fallback), and only Headers matching that list are served.
"""

import os
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app

BACKEND_DIR = Path(__file__).resolve().parent.parent
PYTHON = sys.executable


def test_dev_allows_local_hosts_and_testclient():
    for base in ("http://localhost", "http://127.0.0.1", "http://testserver"):
        # TestClient sends the base_url host as the Host header. The isolated
        # session DB was created by conftest, so /api/health is expected 200.
        r = TestClient(app, base_url=base).get("/api/health")
        assert r.status_code == 200, f"{base} -> {r.status_code}"


def test_dev_rejects_unknown_host():
    r = TestClient(app, base_url="http://evil.example").get("/api/health")
    assert r.status_code == 400


def _production_probe(probe_body: str, *, allowed_hosts: str = "") -> tuple[int, str, str]:
    """Run a subprocess with APP_ENV=production against an isolated database."""
    with tempfile.TemporaryDirectory(prefix="casaaurelia_host_probe_") as td:
        db_path = Path(td) / "prod.db"
        probe = Path(td) / "probe.py"
        uploads_dir = (Path(td) / "uploads").as_posix()
        lines = [
            "import os",
            'os.environ["APP_ENV"] = "production"',
            f'os.environ["DATABASE_URL"] = "sqlite:///{db_path.as_posix()}"',
            'os.environ["SECRET_KEY"] = "prod-host-probe-secret-0123456789abcdefgh"',
            'os.environ["ADMIN_EMAIL"] = "admin@probe.it"',
            'os.environ["ADMIN_PASSWORD"] = "probe-admin-password-125"',
            f'os.environ["UPLOAD_DIR"] = {uploads_dir!r}',
            'os.environ["CORS_ORIGINS"] = "https://casaaurelia.example"',
        ]
        if allowed_hosts:
            lines.append(f'os.environ["ALLOWED_HOSTS"] = {allowed_hosts!r}')
        lines.append('os.environ.pop("RESTAURANT_CAPACITY", None)')
        probe.write_text("\n".join(lines) + "\n\n" + probe_body, encoding="utf-8")
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


def test_production_requires_explicit_allowed_hosts():
    """Without ALLOWED_HOSTS, production must refuse to boot (no "*" fallback)."""
    code, out, err = _production_probe(
        "from app.main import app\nprint('UNREACHABLE')\n",
        allowed_hosts="",
    )
    assert code != 0, f"production boot should have failed, but exited {code}\n{out}\n{err}"
    combined = out + err
    assert "ALLOWED_HOSTS" in combined
    assert "UNREACHABLE" not in combined


def test_production_serves_only_allowed_host():
    code, out, err = _production_probe(
        textwrap.dedent(
            """
            from fastapi.testclient import TestClient
            from app.main import app
            allowed = TestClient(app, base_url="http://casaaurelia.example").get("/api/health")
            rejected = TestClient(app, base_url="http://testserver").get("/api/health")
            print("ALLOWED", allowed.status_code)
            print("REJECTED", rejected.status_code)
            """
        ),
        allowed_hosts="casaaurelia.example",
    )
    assert code == 0, f"probe exited {code}\nSTDOUT:\n{out}\nSTDERR:\n{err}"
    assert "ALLOWED 200" in out, out
    assert "REJECTED 400" in out, out
