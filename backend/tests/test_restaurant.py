"""Restaurant admin management tests (isolated DB).

Covers the public GET contract plus the admin GET/PATCH routes introduced for
Restaurant Information Management. The isolated test DB is seeded with a single
restaurant row by conftest.py; mutation tests restore the baseline row in a
``finally`` block so ordering never affects later tests.
"""

from app.core.security import get_password_hash
from app.db.database import SessionLocal
from app.models.user import User

ADMIN_PATH = "/api/admin/restaurant"

RESPONSE_FIELDS = {
    "id", "name", "tagline", "address", "city", "country", "phone",
    "email", "currency", "lunch_hours", "dinner_hours", "closed_day",
    "capacity", "social_links", "logo_url",
}


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _create_staff_user(email: str) -> None:
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first() is None:
            db.add(User(
                email=email,
                hashed_password=get_password_hash("staff-password-123"),
                full_name="Staff User",
                is_active=True,
                role="staff",
            ))
            db.commit()
    finally:
        db.close()


def _staff_token(client, email: str) -> str:
    resp = client.post("/api/auth/login", json={
        "email": email,
        "password": "staff-password-123",
    })
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]


def _baseline(client, admin_token):
    r = client.get(ADMIN_PATH, headers=_auth(admin_token))
    assert r.status_code == 200, r.text
    return {k: v for k, v in r.json().items() if k != "id"}


def _restore(client, admin_token, baseline):
    r = client.patch(ADMIN_PATH, headers=_auth(admin_token), json=baseline)
    assert r.status_code == 200, r.text


def test_admin_get_requires_auth(client):
    assert client.get(ADMIN_PATH).status_code == 401


def test_admin_patch_requires_auth(client):
    assert client.patch(ADMIN_PATH, json={"name": "Not Allowed"}).status_code == 401


def test_admin_endpoints_forbid_non_admin(client):
    _create_staff_user("staff-restaurant@test.it")
    token = _staff_token(client, "staff-restaurant@test.it")
    headers = _auth(token)
    assert client.get(ADMIN_PATH, headers=headers).status_code == 403
    assert client.patch(ADMIN_PATH, headers=headers, json={"name": "Not Allowed"}).status_code == 403


def test_admin_get_ok(client, admin_token):
    r = client.get(ADMIN_PATH, headers=_auth(admin_token))
    assert r.status_code == 200
    assert RESPONSE_FIELDS.issubset(r.json().keys())


def test_admin_get_matches_public_contract(client, admin_token):
    admin_body = client.get(ADMIN_PATH, headers=_auth(admin_token)).json()
    public_body = client.get("/api/restaurant").json()
    assert admin_body == public_body


def test_admin_patch_partial_update(client, admin_token):
    baseline = _baseline(client, admin_token)
    try:
        r = client.patch(ADMIN_PATH, headers=_auth(admin_token), json={
            "tagline": "A redesigned tagline",
            "capacity": 62,
        })
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["tagline"] == "A redesigned tagline"
        assert body["capacity"] == 62
        for field, value in baseline.items():
            if field not in ("tagline", "capacity"):
                assert body[field] == value, field
        public_body = client.get("/api/restaurant").json()
        assert public_body["tagline"] == "A redesigned tagline"
        assert public_body["capacity"] == 62
    finally:
        _restore(client, admin_token, baseline)


def test_admin_patch_normalizes_lowercase_closed_day(client, admin_token):
    baseline = _baseline(client, admin_token)
    try:
        r = client.patch(ADMIN_PATH, headers=_auth(admin_token), json={"closed_day": "saturday"})
        assert r.status_code == 200, r.text
        assert r.json()["closed_day"] == "Saturday"
    finally:
        _restore(client, admin_token, baseline)


def test_admin_patch_normalizes_mixed_case_closed_day(client, admin_token):
    baseline = _baseline(client, admin_token)
    try:
        r = client.patch(ADMIN_PATH, headers=_auth(admin_token), json={"closed_day": "WeDnEsDaY"})
        assert r.status_code == 200, r.text
        assert r.json()["closed_day"] == "Wednesday"
    finally:
        _restore(client, admin_token, baseline)


def test_admin_patch_rejects_invalid_capacity(client, admin_token):
    r = client.patch(ADMIN_PATH, headers=_auth(admin_token), json={"capacity": 0})
    assert r.status_code == 422


def test_admin_patch_rejects_invalid_currency(client, admin_token):
    r = client.patch(ADMIN_PATH, headers=_auth(admin_token), json={"currency": "euro"})
    assert r.status_code == 422


def test_admin_patch_rejects_invalid_closed_day(client, admin_token):
    r = client.patch(ADMIN_PATH, headers=_auth(admin_token), json={"closed_day": "Funday"})
    assert r.status_code == 422


def test_admin_patch_rejects_invalid_email(client, admin_token):
    r = client.patch(ADMIN_PATH, headers=_auth(admin_token), json={"email": "not-an-email"})
    assert r.status_code == 422


def test_admin_patch_social_links_roundtrip(client, admin_token):
    baseline = _baseline(client, admin_token)
    try:
        payload = {
            "instagram": "https://www.instagram.com/casaaurelia",
            "facebook": None,
            "tripadvisor": "https://www.tripadvisor.com/restaurant",
        }
        r = client.patch(ADMIN_PATH, headers=_auth(admin_token), json={"social_links": payload})
        assert r.status_code == 200, r.text
        assert r.json()["social_links"] == payload
        public_social = client.get("/api/restaurant").json()["social_links"]
        assert public_social == payload
    finally:
        _restore(client, admin_token, baseline)