"""Reservation regression tests (isolated DB).

These verify the public API business rules and invariants. All data is isolated
to the temporary test database via conftest fixtures.
"""

from datetime import date, timedelta

import pytest

from app.core.config import get_settings
from app.db.database import SessionLocal


def _future_weekday(day_index: int = 2, offset_days: int = 7):
    """Return a future date that falls on `day_index` (Mon=0..Sun=6)."""
    d = date.today() + timedelta(days=offset_days)
    while d.weekday() != day_index:
        d += timedelta(days=1)
    return d


NON_CLOSED_DAY = _future_weekday(day_index=2)  # a Wednesday
CLOSED_DAY = _future_weekday(day_index=0)       # a Monday


def _payload(**overrides):
    base = {
        "first_name": "Maria",
        "last_name": "Rossi",
        "email": "maria@example.it",
        "phone": "+39 333 1234567",
        "reservation_date": str(NON_CLOSED_DAY),
        "reservation_time": "19:00",
        "guests": 2,
        "special_requests": None,
    }
    base.update(overrides)
    return base


def _active_count():
    db = SessionLocal()
    try:
        from sqlalchemy import func
        from app.models.reservation import Reservation
        return db.query(func.coalesce(func.count(Reservation.id), 0)).filter(
            Reservation.deleted_at.is_(None)
        ).scalar()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _reset(db_session):
    """Empty reservations and restore capacity=40 before each reservation test."""
    from sqlalchemy import func
    from app.models.reservation import Reservation
    from app.models.restaurant import Restaurant
    db_session.query(Reservation).delete()
    restaurant = db_session.query(Restaurant).first()
    if restaurant:
        restaurant.capacity = 40
    db_session.commit()
    yield
    # Never leave residue in the shared isolated DB.
    db_session.query(Reservation).delete()
    db_session.commit()


def test_availability_ok(client):
    r = client.get("/api/reservations/availability",
                   params={"date": str(NON_CLOSED_DAY), "time": "19:00", "guests": 2})
    assert r.status_code == 200
    body = r.json()
    assert body["available"] is True
    assert body["remaining_capacity"] == 40


def test_closed_day_booking_rejected(client):
    r = client.post("/api/reservations", json=_payload(reservation_date=str(CLOSED_DAY)))
    assert r.status_code == 409
    assert "Monday" in r.json()["detail"]


def test_normal_day_booking_ok(client):
    r = client.post("/api/reservations", json=_payload())
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "pending"
    assert body["reference_code"].startswith("CASA-")


def test_duplicate_prevented(client):
    p = _payload()
    assert client.post("/api/reservations", json=p).status_code == 201
    r = client.post("/api/reservations", json=p)
    assert r.status_code == 409
    assert "already have a reservation" in r.json()["detail"]


def test_lookup_ok(client):
    created = client.post("/api/reservations", json=_payload()).json()
    r = client.post("/api/reservations/lookup", json={
        "reference_code": created["reference_code"],
        "email": created["email"],
    })
    assert r.status_code == 200
    assert r.json()["reference_code"] == created["reference_code"]


def test_lookup_wrong_email_rejected(client):
    created = client.post("/api/reservations", json=_payload()).json()
    r = client.post("/api/reservations/lookup", json={
        "reference_code": created["reference_code"],
        "email": "other@example.it",
    })
    assert r.status_code == 404


def test_customer_cancel_ok(client):
    created = client.post("/api/reservations", json=_payload()).json()
    r = client.post("/api/reservations/customer/cancel", json={
        "reference_code": created["reference_code"],
        "email": created["email"],
    })
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"


def test_double_cancel_rejected(client):
    created = client.post("/api/reservations", json=_payload()).json()
    ref = created["reference_code"]
    email = created["email"]
    client.post("/api/reservations/customer/cancel", json={"reference_code": ref, "email": email})
    r = client.post("/api/reservations/customer/cancel", json={"reference_code": ref, "email": email})
    assert r.status_code == 404


def test_capacity_rejection(client, db_session):
    from app.models.restaurant import Restaurant
    restaurant = db_session.query(Restaurant).first()
    restaurant.capacity = 4
    db_session.commit()
    assert client.post("/api/reservations", json=_payload(guests=3)).status_code == 201
    r = client.post("/api/reservations", json=_payload(guests=3, email="other@example.it"))
    assert r.status_code == 409
    assert "seats" in r.json()["detail"].lower()


def test_cancelled_does_not_consume_capacity(client, db_session):
    from app.models.restaurant import Restaurant
    restaurant = db_session.query(Restaurant).first()
    restaurant.capacity = 4
    db_session.commit()
    created = client.post("/api/reservations", json=_payload(guests=4)).json()
    client.post("/api/reservations/customer/cancel", json={
        "reference_code": created["reference_code"], "email": created["email"]})
    # After cancel, capacity is free again.
    r = client.post("/api/reservations", json=_payload(guests=4, email="free@example.it"))
    assert r.status_code == 201


def test_soft_deleted_does_not_consume_capacity(client, db_session, admin_token):
    from app.models.restaurant import Restaurant
    restaurant = db_session.query(Restaurant).first()
    restaurant.capacity = 4
    db_session.commit()
    created = client.post("/api/reservations", json=_payload(guests=4)).json()
    rid = created["id"]
    r = client.delete(f"/api/reservations/{rid}", headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 204
    # Soft-deleted no longer consumes capacity.
    r2 = client.post("/api/reservations", json=_payload(guests=4, email="free2@example.it"))
    assert r2.status_code == 201


def test_admin_requires_auth(client):
    assert client.get("/api/reservations").status_code == 401
    assert client.get("/api/reservations/stats").status_code == 401


def test_admin_list_and_update(client, admin_token):
    created = client.post("/api/reservations", json=_payload()).json()
    headers = {"Authorization": f"Bearer {admin_token}"}
    lst = client.get("/api/reservations", headers=headers)
    assert lst.status_code == 200
    assert lst.json()["total"] == 1
    upd = client.patch(f"/api/reservations/{created['id']}",
                       json={"status": "confirmed"}, headers=headers)
    assert upd.status_code == 200
    assert upd.json()["status"] == "confirmed"


def test_pagination(client, admin_token, _reset):
    for i in range(5):
        client.post("/api/reservations", json=_payload(email=f"user{i}@example.it"))
    r = client.get("/api/reservations", params={"page": 1, "page_size": 2},
                   headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 5
    assert len(body["items"]) == 2
    assert body["total_pages"] == 3


def test_admin_unauthorized_nonadmin_not_tested():
    # Only one admin role exists in this deployment; non-admin creation is not
    # part of the schema. Placeholder to keep parity with the source list.
    pass


def test_invalid_date(client):
    past = (date.today() - timedelta(days=1)).isoformat()
    r = client.post("/api/reservations", json=_payload(reservation_date=past))
    assert r.status_code == 422


def test_invalid_time(client):
    r = client.post("/api/reservations", json=_payload(reservation_time="25:99"))
    assert r.status_code == 422


def test_invalid_guests(client):
    r = client.post("/api/reservations", json=_payload(guests=99))
    assert r.status_code == 422


def test_invalid_email(client):
    r = client.post("/api/reservations", json=_payload(email="not-an-email"))
    assert r.status_code == 422


def test_invalid_phone(client):
    r = client.post("/api/reservations", json=_payload(phone="12"))
    assert r.status_code == 422


def test_invalid_reference_lookup(client):
    r = client.post("/api/reservations/lookup",
                    json={"reference_code": "", "email": "x@example.it"})
    assert r.status_code == 422
