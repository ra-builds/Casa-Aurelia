"""Authentication tests (isolated DB).

P1 hardening: the refresh token is delivered as an HttpOnly cookie and the access
token is returned in the body only. These tests cover login, refresh, logout,
expired access tokens, invalid refresh tokens, cookie attributes and admin gating.
"""

from datetime import timedelta

from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash
from app.db.database import SessionLocal
from app.models.user import User


def _login_headers(client):
    r = client.post("/api/auth/login", json={
        "email": get_settings().admin_email,
        "password": get_settings().admin_password,
    })
    assert r.status_code == 200
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def test_login_ok(client):
    r = client.post("/api/auth/login", json={
        "email": get_settings().admin_email,
        "password": get_settings().admin_password,
    })
    assert r.status_code == 200
    body = r.json()
    assert "access_token" in body
    # The refresh token must NOT be exposed in the response body (cookie only).
    assert "refresh_token" not in body
    set_cookie = r.headers.get("set-cookie", "")
    assert get_settings().auth_cookie_name in set_cookie


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


def test_alg_none_token_rejected(client):
    import base64, json
    b64 = lambda obj: base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()
    forged = f"{b64({'alg': 'none', 'typ': 'JWT'})}.{b64({'sub': 'admin', 'type': 'access'})}.signature"
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert r.status_code == 401


def test_refresh_ok_with_cookie(client):
    client.cookies.clear()  # the shared session client persists cookies
    client.post("/api/auth/login", json={
        "email": get_settings().admin_email,
        "password": get_settings().admin_password,
    })
    # Refresh relies on the HttpOnly cookie set during login (auto-sent by the
    # TestClient cookie jar); no token is passed in the body.
    r = client.post("/api/auth/refresh", json={})
    assert r.status_code == 200
    assert "access_token" in r.json()
    # Rotation: a fresh refresh cookie is set again.
    assert get_settings().auth_cookie_name in r.headers.get("set-cookie", "")


def test_refresh_invalid_cookie(client):
    client.cookies.clear()
    client.cookies.set(get_settings().auth_cookie_name, "garbage")
    r = client.post("/api/auth/refresh", json={})
    assert r.status_code == 401


def test_refresh_missing_cookie(client):
    client.cookies.clear()
    r = client.post("/api/auth/refresh", json={})
    assert r.status_code == 401


def test_expired_access_token_rejected(client):
    token = create_access_token(
        {"sub": get_settings().admin_email},
        expires_delta=timedelta(minutes=-1),
    )
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 401


def test_logout_clears_refresh_cookie(client):
    client.cookies.clear()
    client.post("/api/auth/login", json={
        "email": get_settings().admin_email,
        "password": get_settings().admin_password,
    })
    r = client.post("/api/auth/logout")
    assert r.status_code == 204
    # After logout, refreshing with the (now-cleared) cookie is rejected.
    # A new request no longer carries a valid refresh cookie.
    rr = client.post("/api/auth/refresh", json={})
    assert rr.status_code == 401


def test_refresh_cookie_attributes(client):
    client.cookies.clear()
    r = client.post("/api/auth/login", json={
        "email": get_settings().admin_email,
        "password": get_settings().admin_password,
    })
    set_cookie = r.headers.get("set-cookie", "")
    assert "HttpOnly" in set_cookie
    assert "samesite=lax" in set_cookie.lower()


def test_admin_endpoint_forbidden_for_non_admin(client):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "staff@test.it").first()
        if not existing:
            db.add(User(
                email="staff@test.it",
                hashed_password=get_password_hash("staff-password-123"),
                full_name="Staff User",
                is_active=True,
                role="staff",
            ))
            db.commit()
    finally:
        db.close()

    login = client.post("/api/auth/login", json={
        "email": "staff@test.it",
        "password": "staff-password-123",
    }).json()
    token = login["access_token"]
    # Admin-only endpoint must reject a non-admin role.
    r = client.get("/api/reservations/stats", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403
