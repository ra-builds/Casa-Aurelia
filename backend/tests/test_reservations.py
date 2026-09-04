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
    first = client.post("/api/reservations/customer/cancel", json={"reference_code": ref, "email": email})
    assert first.status_code == 200
    r = client.post("/api/reservations/customer/cancel", json={"reference_code": ref, "email": email})
    # The reservation still EXISTS (it was just cancelled), so a repeat cancel is
    # a state conflict (409), not a missing resource (404). Previously this
    # endpoint mapped the "already cancelled" case to 404, contradicting the true
    # state of the record.
    assert r.status_code == 409
    assert "already been cancelled" in r.json()["detail"].lower()
    # A genuinely missing reference must still be a 404 (distinct from conflict).
    missing = client.post("/api/reservations/customer/cancel", json={
        "reference_code": "CASA-MISSING", "email": email})
    assert missing.status_code == 404


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


def test_admin_reactivation_respects_capacity(client, admin_token, db_session):
    """Admin reactivation of a cancelled reservation must not oversubscribe.

    Every other capacity path (create, concurrency, availability) enforces the
    capacity invariant, but reactivating a cancelled reservation to an active
    status via the admin PATCH endpoint previously did no capacity check: after
    cancel->rebuild-full->reactivate, the restaurant could hold more active
    guests than its capacity. Reactivation must reject (409) when it would
    exceed capacity.
    """
    from app.models.restaurant import Restaurant
    restaurant = db_session.query(Restaurant).first()
    restaurant.capacity = 4
    db_session.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}
    day = str(_future_weekday(day_index=2))

    ra = client.post("/api/reservations", json=_payload(email="reac-a@example.it", guests=4))
    assert ra.status_code == 201
    rid = ra.json()["id"]

    r_cancel = client.patch(f"/api/reservations/{rid}", json={"status": "cancelled"}, headers=headers)
    assert r_cancel.status_code == 200
    assert r_cancel.json()["status"] == "cancelled"

    rb = client.post("/api/reservations", json=_payload(email="reac-b@example.it", guests=4))
    assert rb.status_code == 201  # capacity freed by the cancel, so this fits

    r_reac = client.patch(f"/api/reservations/{rid}", json={"status": "confirmed"}, headers=headers)
    # Reactivating the first 4-guest reservation while a different one already
    # holds all 4 seats must be a conflict, not a silent oversubscription (8/4).
    assert r_reac.status_code == 409, (r_reac.status_code, r_reac.text)
    assert "seats" in r_reac.json()["detail"].lower()


def test_admin_reactivation_no_active_duplicate(client, admin_token, db_session):
    """Admin reactivation of a cancelled reservation must not create an active
    duplicate.

    The duplicate-reservation invariant forbids more than one ACTIVE
    (non-cancelled, non-deleted) reservation per (email, reservation_date,
    reservation_time) -- enforced at create time by the atomic
    _duplicate_ok_condition and by check_duplicate_reservation. A customer may
    legitimately rebook after cancelling, so when the admin later reactivates the
    OLD cancelled reservation it would coexist with the NEW active one as a
    second active duplicate. Reactivation must reject (409) in that case.
    """
    headers = {"Authorization": f"Bearer {admin_token}"}

    first = client.post("/api/reservations", json=_payload(email="dup-a@example.it"))
    assert first.status_code == 201
    ref = first.json()["reference_code"]
    first_id = first.json()["id"]

    r_cancel = client.post("/api/reservations/customer/cancel",
                           json={"reference_code": ref, "email": "dup-a@example.it"})
    assert r_cancel.status_code == 200

    rebook = client.post("/api/reservations", json=_payload(email="dup-a@example.it"))
    assert rebook.status_code == 201  # duplicate guard excludes the cancelled one

    r_reac = client.patch(f"/api/reservations/{first_id}", json={"status": "confirmed"}, headers=headers)
    # Reactivating the old cancelled row while the new one is already active for
    # the same email+date+time must be a conflict, not an active duplicate.
    assert r_reac.status_code == 409, (r_reac.status_code, r_reac.text)
    assert "reservation" in r_reac.json()["detail"].lower()

    from app.models.reservation import Reservation
    from datetime import time
    from app.db.database import SessionLocal
    db = SessionLocal()
    try:
        n = db.query(Reservation).filter(
            Reservation.email == "dup-a@example.it",
            Reservation.reservation_date == NON_CLOSED_DAY,
            Reservation.reservation_time == time(19, 0),
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        ).count()
        assert n == 1  # only the new rebooked reservation remains active
    finally:
        db.close()


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


def test_past_date_availability_rejected(client):
    """Availability must not report a past date as bookable.

    The create endpoint rejects any date before server-local `date.today()`
    (test_invalid_date, 422), so the availability check reporting such a date
    as `available: true` would contradict what can actually be reserved. Pick a
    past date that is not the restaurant's closed day (Monday) so the assertion
    isolates the past-date guard rather than the closed-day branch.
    """
    from datetime import date, timedelta
    past = date.today() - timedelta(days=2)
    while past.weekday() == 0:
        past -= timedelta(days=1)
    r = client.get("/api/reservations/availability",
                   params={"date": past.isoformat(), "time": "19:00", "guests": 2})
    assert r.status_code == 200
    body = r.json()
    assert body["available"] is False


def test_availability_invalid_time_slot_rejected(client):
    """Availability must reject a time slot that can never be reserved.

    The create endpoint validates `reservation_time` against VALID_TIME_SLOTS
    and rejects anything else with 422 (test_invalid_time). `check_availability`
    previously accepted any string: a well-formed but non-slot value such as
    "15:00" was reported `available: true` (contradicting what can actually be
    booked), and a malformed value such as "25:99" blew up into a 500. The
    availability contract must not advertise a slot the create contract refuses.
    """
    d = _future_weekday(day_index=2)  # a non-closed Wednesday
    for slot in ("15:00", "25:99"):
        r = client.get("/api/reservations/availability",
                       params={"date": d.isoformat(), "time": slot, "guests": 2})
        assert r.status_code == 422, (slot, r.status_code, r.text)


def test_min_date_boundary_today_accepted(client):
    """The frontend's earliest selectable date (its local 'today') is valid.

    The frontend `getMinDate()` is the viewer's LOCAL calendar day; the backend
    boundary is server-local `date.today()` (any date at or after it is
    accepted, before it is rejected). This guards that agreement, which Phase 8J
    establishes by no longer deriving the picker's `min` from the UTC date.
    """
    today = date.today()
    if today.weekday() == 0:  # Monday is the restaurant's closed day
        boundary = today + timedelta(days=1)
    else:
        boundary = today
    r = client.post(
        "/api/reservations",
        json=_payload(
            reservation_date=boundary.isoformat(),
            email="boundary@example.it",
        ),
    )
    assert r.status_code == 201, r.text


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


def test_get_stats_aggregates_today_guests_in_sql(db_session):
    """Verify the get_stats aggregates (today_count / today_guests) semantics.

    today_count counts every non-deleted reservation dated today (any status);
    today_guests sums only the non-cancelled guests of today. Soft-deleted rows
    are excluded entirely. This regression protects the SQL-based rewrite of the
    previously in-memory aggregation in reservation_service.get_stats.
    """
    from datetime import datetime, time, timezone

    from app.models.reservation import Reservation
    from app.services.reservation_service import get_stats

    today = date.today()
    made = [0]

    def _make(email, guests, status, day=None, deleted=False):
        made[0] += 1
        r = Reservation(
            reference_code=f"CASA-T{made[0]:04d}",
            first_name="T", last_name="T", email=email, phone="+39 333 1234567",
            reservation_date=day or today, reservation_time=time(19, 0),
            guests=guests, special_requests=None, status=status,
        )
        db_session.add(r)
        db_session.flush()
        if deleted:
            r.deleted_at = datetime.now(timezone.utc)
        return r

    # today / non-cancelled (count for today_count AND today_guests)
    _make("a@x.it", 2, "pending")
    _make("b@x.it", 3, "confirmed")
    # today / cancelled (counts for today_count but NOT today_guests)
    _make("c@x.it", 5, "cancelled")
    # today / soft-deleted (excluded from everything)
    _make("d@x.it", 1, "pending", deleted=True)
    # future date (counts in total/upcoming, not in today_*)
    _make("e@x.it", 4, "pending", day=today + timedelta(days=1))
    db_session.commit()

    stats = get_stats(db_session)
    assert stats.today_count == 3          # a, b, c (non-deleted dated today)
    assert stats.today_guests == 5          # 2 + 3 (a+b); cancelled/deleted/future excluded
    assert stats.total == 4                 # a, b, c, e (non-deleted)
    assert stats.pending == 2               # a, e
    assert stats.confirmed == 1             # b
    assert stats.cancelled == 1             # c
    assert stats.upcoming == 3              # a, b, e (>= today and non-cancelled)


def test_reference_collision_retries_with_fresh_code(monkeypatch, _reset):
    """A UNIQUE reference_code collision is retried, not surfaced as a 500."""
    from app.schemas.reservation import ReservationCreate
    from app.services import reservation_service as rs

    db = SessionLocal()
    try:
        first = rs.create_reservation(
            db, ReservationCreate(**_payload(email="collide-a@example.it"))
        )
    finally:
        db.close()

    calls = {"n": 0}

    def fake_generate():
        calls["n"] += 1
        if calls["n"] == 1:
            return first.reference_code  # collide on the first attempt
        return "CASA-ABCDEF"  # fresh code used on the retry

    monkeypatch.setattr(rs, "generate_reference_code", fake_generate)

    db = SessionLocal()
    try:
        created = rs.create_reservation(
            db,
            ReservationCreate(
                **_payload(email="collide-b@example.it", reservation_time="20:00")
            ),
        )
    finally:
        db.close()

    assert created.reference_code == "CASA-ABCDEF"
    assert calls["n"] == 2  # one collision + one successful retry
    assert created.reference_code != first.reference_code


def test_persistent_reference_collision_raises_error(monkeypatch, _reset):
    """Exhausting retries raises a clear error instead of hanging/500ing."""
    from app.schemas.reservation import ReservationCreate
    from app.services import reservation_service as rs

    db = SessionLocal()
    try:
        first = rs.create_reservation(
            db, ReservationCreate(**_payload(email="persist-a@example.it"))
        )
    finally:
        db.close()

    monkeypatch.setattr(rs, "generate_reference_code", lambda: first.reference_code)

    with pytest.raises(RuntimeError, match="reference code"):
        db = SessionLocal()
        try:
            rs.create_reservation(
                db,
                ReservationCreate(
                    **_payload(email="persist-b@example.it", reservation_time="20:00")
                ),
            )
        finally:
            db.close()
