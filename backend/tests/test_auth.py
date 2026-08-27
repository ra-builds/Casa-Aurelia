"""Authentication tests (isolated DB)."""

from app.core.config import get_settings


def test_login_ok(client):
    r = client.post("/api/auth/login", json={
        "email": get_settings().admin_email,
        "password": get_settings().admin_password,
    })
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    assert "refresh_token" in body


def test_login_bad_password(client):
    r = client.post("/api/auth/login", json={
        "email": get_settings().admin_email,
        "password": "wrong-password",
    })
    assert r.status_code == 401


def test_login_unknown_user(client):
    r = client.post("/api/auth/login", json={
        "email": "nobody@example.it",
        "password": "whatever",
    })
    assert r.status_code == 401


def test_me_ok(client, admin_token):
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    assert r.json()["email"] == get_settings().admin_email


def test_me_unauthenticated(client):
    assert client.get("/api/auth/me").status_code == 401


def test_me_malformed_token(client):
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert r.status_code == 401


def test_refresh_ok(client):
    login = client.post("/api/auth/login", json={
        "email": get_settings().admin_email,
        "password": get_settings().admin_password,
    }).json()
    r = client.post("/api/auth/refresh", json={"refresh_token": login["refresh_token"]})
    assert r.status_code == 200
    assert "access_token" in r.json()


def test_refresh_invalid(client):
    r = client.post("/api/auth/refresh", json={"refresh_token": "garbage"})
    assert r.status_code == 401


def test_alg_none_token_rejected(client):
    # A JWT forged with alg=none must never authenticate, regardless of payload.
    import base64, json
    b64 = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()
    forged = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'sub': 'admin', 'type': 'access'})}.signature"
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 401
