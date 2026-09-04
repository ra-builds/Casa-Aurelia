"""Holiday / blackout closures tests (isolated).

Covers the public closure listing, admin CRUD (auth-gated), and the booking
integration: closures must make a date unavailable to check_availability and be
rejected by create_reservation exactly like the weekly closed_day.
"""

from datetime import date, timedelta

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.database import SessionLocal
from app.models.closure import Closure
from app.models.user import User


def _future_non_monday(offset: int = 1) -> date:
    """A date >= tomorrow that is not the restaurant's weekly closed day (Monday).

    ``offset`` adds extra days so multiple tests in the shared session use
    distinct dates (closure_date is unique).
    """
    d = date.today() + timedelta(days=offset)
    while d.weekday() == 0:  # 0 == Monday
        d += timedelta(days=1)
    return d


def _admin_token(client) -> str:
    return client.post("/api/auth/login", json={
        "email": get_settings().admin_email,
        "password": get_settings().admin_password,
    }).json()["access_token"]


def test_empty_listing(client, db_session):
    db_session.query(Closure).delete()
    db_session.commit()
    assert client.get("/api/closures").json() == []


def test_create_list_and_delete(client):
    token = _admin_token(client)
    auth = {"Authorization": f"Bearer {token}"}
    closure_date = _future_non_monday(offset=1)

    created = client.post(
        "/api/admin/closures",
        headers=auth,
        json={"closure_date": str(closure_date), "reason": "Public holiday"},
    )
    assert created.status_code == 201
    body = created.json()
    assert body["closure_date"] == str(closure_date)
    assert body["reason"] == "Public holiday"

    listed = client.get("/api/admin/closures", headers=auth).json()
    assert [c["id"] for c in listed] == [body["id"]]

    public = client.get("/api/closures").json()
    assert str(closure_date) in {c["closure_date"] for c in public}

    deleted = client.delete(f"/api/admin/closures/{body['id']}", headers=auth)
    assert deleted.status_code == 204
    assert client.get("/api/closures").json() == []


def test_duplicate_date_conflict(client):
    token = _admin_token(client)
    auth = {"Authorization": f"Bearer {token}"}
    closure_date = _future_non_monday(offset=2)
    client.post("/api/admin/closures", headers=auth, json={"closure_date": str(closure_date)})
    r = client.post("/api/admin/closures", headers=auth, json={"closure_date": str(closure_date)})
    assert r.status_code == 409


def test_delete_missing_404(client):
    token = _admin_token(client)
    r = client.delete("/api/admin/closures/999999", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 404


def test_admin_endpoints_require_auth(client):
    assert client.get("/api/admin/closures").status_code == 401
    assert client.post("/api/admin/closures", json={"closure_date": "2030-01-01"}).status_code == 401


def test_admin_endpoints_forbid_non_admin(client):
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == "staff-closure@test.it").first()
        if not existing:
            db.add(User(
                email="staff-closure@test.it",
                hashed_password=get_password_hash("staff-password-123"),
                full_name="Staff User",
                is_active=True,
                role="staff",
            ))
            db.commit()
    finally:
        db.close()

    token = client.post("/api/auth/login", json={
        "email": "staff-closure@test.it",
        "password": "staff-password-123",
    }).json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}

    assert client.get("/api/admin/closures", headers=auth).status_code == 403
    assert client.post(
        "/api/admin/closures", headers=auth, json={"closure_date": "2030-01-02"}
    ).status_code == 403


def test_availability_reports_closed_on_closure_date(client, db_session):
    db_session.rollback()  # clear any pending state from earlier tests in the run
    closure_date = _future_non_monday(offset=3)
    db_session.add(Closure(closure_date=closure_date, reason="Event"))
    db_session.commit()

    r = client.get(
        "/api/reservations/availability",
        params={"date": str(closure_date), "time": "19:30", "guests": 2},
    )
    assert r.status_code == 200
    assert r.json()["available"] is False
    assert "closed" in r.json()["message"].lower()


def test_create_reservation_rejected_on_closure_date(client, db_session):
    db_session.rollback()  # clear any pending state from earlier tests in the run
    closure_date = _future_non_monday(offset=4)
    db_session.add(Closure(closure_date=closure_date, reason="Vacation"))
    db_session.commit()

    r = client.post("/api/reservations", json={
        "first_name": "Anna",
        "last_name": "Bianchi",
        "email": "anna@example.it",
        "phone": "+39 333 1234567",
        "reservation_date": str(closure_date),
        "reservation_time": "19:30",
        "guests": 2,
    })
    assert r.status_code == 409
    assert "closed" in r.json()["detail"].lower()
