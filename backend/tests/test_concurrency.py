"""Concurrency tests for the atomic capacity reservation (CC1).

These prove that concurrent reservation requests cannot oversubscribe the
restaurant's capacity. They run directly against the service layer with one
Session per thread, all bound to the same isolated file-backed SQLite database
(so separate connections contend on the same write lock under WAL).
"""

from datetime import date, timedelta
from threading import Barrier, Thread

import pytest

from app.db.database import SessionLocal
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.schemas.reservation import ReservationCreate
from app.services import reservation_service as rs


def _future_date(day_index: int = 2):
    d = date.today() + timedelta(days=7)
    while d.weekday() != day_index:
        d += timedelta(days=1)
    return d


DATE = _future_date()
# A different, also-valid, non-Monday future date for same-email/different-date tests.
ALT_DATE = _future_date(day_index=4)


def _seed_capacity(capacity: int):
    """Reset reservations and set restaurant capacity. Returns a session."""
    db = SessionLocal()
    db.query(Reservation).delete()
    restaurant = db.query(Restaurant).first()
    restaurant.capacity = capacity
    db.commit()
    db.close()


def _payload(email: str, guests: int, reservation_date=None, reservation_time="19:00"):
    return ReservationCreate(
        first_name="C", last_name="T", email=email, phone="+39 333 1234567",
        reservation_date=reservation_date or DATE, reservation_time=reservation_time,
        guests=guests,
        special_requests=None,
    )


def _count_active(email: str, reservation_date, reservation_time: str):
    """Number of active (non-cancelled, non-deleted) reservations for a key.

    Asserts against the actual database state, not HTTP responses.
    """
    parsed = rs._parse_time(reservation_time)
    db = SessionLocal()
    try:
        return db.query(Reservation).filter(
            Reservation.email == email.lower(),
            Reservation.reservation_date == reservation_date,
            Reservation.reservation_time == parsed,
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        ).count()
    finally:
        db.close()


def _count_rows():
    db = SessionLocal()
    try:
        return db.query(Reservation).count()
    finally:
        db.close()


def _run_concurrent(payloads):
    """Run create_reservation concurrently, one Session per thread.

    Returns (successes, failures) where success = list of created reservations,
    failure = list of (error_message).
    """
    barrier = Barrier(len(payloads))
    results = {}

    def worker(idx, p):
        db = SessionLocal()
        try:
            barrier.wait(timeout=10)
            r = rs.create_reservation(db, p)
            results[idx] = ("ok", r)
        except Exception as e:  # noqa: BLE001
            try:
                db.rollback()
            except Exception:
                pass
            results[idx] = ("err", str(e))
        finally:
            db.close()

    threads = [Thread(target=worker, args=(i, p)) for i, p in enumerate(payloads)]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)

    successes = [r for k, r in results.items() if results[k] and results[k][0] == "ok"]
    failures = [r for k, r in results.items() if results and results[k] and results[k][0] == "err"]
    return successes, failures


def _active_guest_sum():
    db = SessionLocal()
    try:
        from sqlalchemy import func
        return db.query(func.coalesce(func.sum(Reservation.guests), 0)).filter(
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        ).scalar()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def _clean():
    _seed_capacity(40)
    yield
    _seed_capacity(40)


def _assert_no_overbooking(capacity):
    assert _active_guest_sum() <= capacity


def test_scenario_A_capacity4_3plus3_exactly_one_succeeds():
    _seed_capacity(4)
    successes, failures = _run_concurrent([
        _payload("a@x.it", 3),
        _payload("b@x.it", 3),
    ])
    assert len(successes) == 1, f"expected exactly 1 success, got {len(successes)}"
    assert len(failures) == 1
    _assert_no_overbooking(4)


def test_scenario_B_capacity4_2plus2_both_succeed():
    _seed_capacity(4)
    successes, failures = _run_concurrent([
        _payload("a@x.it", 2),
        _payload("b@x.it", 2),
    ])
    assert len(successes) == 2, f"expected both to succeed, got {len(successes)}"
    assert len(failures) == 0
    assert _active_guest_sum() == 4


def test_scenario_C_existing3_concurrent2_rejected():
    _seed_capacity(4)
    # Pre-existing active reservation of 3 guests.
    db = SessionLocal()
    rs.create_reservation(db, _payload("existing@x.it", 3))
    db.close()
    _, failures = _run_concurrent([_payload("new@x.it", 2)])
    assert len(failures) == 1
    assert "seats" in failures[0][1].lower()
    _assert_no_overbooking(4)


def test_scenario_D_cancelled_does_not_consume_capacity():
    _seed_capacity(4)
    # A cancelled reservation must not count toward capacity; a full booking is allowed.
    db = SessionLocal()
    r = rs.create_reservation(db, _payload("c@x.it", 4))
    db.close()
    db = SessionLocal()
    res = db.query(Reservation).filter(Reservation.reference_code == r.reference_code).one()
    rs.customer_cancel_reservation(db, res.reference_code, res.email)
    db.close()
    successes, _ = _run_concurrent([_payload("after@x.it", 4)])
    assert len(successes) == 1
    _assert_no_overbooking(4)


def test_scenario_E_soft_deleted_does_not_consume_capacity():
    _seed_capacity(4)
    db = SessionLocal()
    r = rs.create_reservation(db, _payload("s@x.it", 4))
    db2 = SessionLocal()
    res = db2.query(Reservation).filter(Reservation.reference_code == r.reference_code).one()
    rs.soft_delete_reservation(db2, res)
    db2.close()
    db.close()
    successes, _ = _run_concurrent([_payload("after2@x.it", 4)])
    assert len(successes) == 1
    _assert_no_overbooking(4)


def test_scenario_F_duplicate_rules_intact():
    _seed_capacity(40)
    db = SessionLocal()
    r1 = rs.create_reservation(db, _payload("dup@x.it", 2))
    db.close()
    # Same email+slot is a duplicate -> rejected even though capacity is ample.
    with pytest.raises(ValueError):
        db = SessionLocal()
        rs.create_reservation(db, _payload("dup@x.it", 2))
        db.close()
    _assert_no_overbooking(40)


# ---------------------------------------------------------------------------
# Phase 8D — concurrent duplicate protection (scenarios A–G).
# Each asserts the resulting DATABASE state, not just HTTP/service responses.
# ---------------------------------------------------------------------------


def test_8d_A_same_email_date_time_concurrent_exactly_one():
    _seed_capacity(40)
    successes, failures = _run_concurrent([
        _payload("same@x.it", 2),
        _payload("same@x.it", 2),
    ])
    assert len(successes) == 1, f"expected exactly 1 success, got {len(successes)}"
    assert len(failures) == 1
    assert _count_active("same@x.it", DATE, "19:00") == 1


def test_8d_B_same_email_date_different_time_both_succeed():
    _seed_capacity(40)
    successes, failures = _run_concurrent([
        _payload("multi@x.it", 2, reservation_time="19:00"),
        _payload("multi@x.it", 2, reservation_time="20:00"),
    ])
    assert len(successes) == 2, f"expected both to succeed, got {len(successes)}"
    assert len(failures) == 0
    assert _count_active("multi@x.it", DATE, "19:00") == 1
    assert _count_active("multi@x.it", DATE, "20:00") == 1


def test_8d_C_different_email_same_date_time_both_succeed():
    _seed_capacity(40)
    successes, failures = _run_concurrent([
        _payload("a@x.it", 2),
        _payload("b@x.it", 2),
    ])
    assert len(successes) == 2, f"expected both to succeed, got {len(successes)}"
    assert len(failures) == 0
    assert _count_active("a@x.it", DATE, "19:00") == 1
    assert _count_active("b@x.it", DATE, "19:00") == 1


def test_8d_D_same_email_different_date_same_time_both_succeed():
    _seed_capacity(40)
    successes, failures = _run_concurrent([
        _payload("two@x.it", 2, reservation_date=DATE),
        _payload("two@x.it", 2, reservation_date=ALT_DATE),
    ])
    assert len(successes) == 2, f"expected both to succeed, got {len(successes)}"
    assert len(failures) == 0
    assert _count_active("two@x.it", DATE, "19:00") == 1
    assert _count_active("two@x.it", ALT_DATE, "19:00") == 1


def test_8d_E_cancelled_then_identical_new_booking_succeeds():
    _seed_capacity(40)
    # Book, then cancel it.
    db = SessionLocal()
    r = rs.create_reservation(db, _payload("rec@x.it", 2))
    db.close()
    db = SessionLocal()
    res = db.query(Reservation).filter(Reservation.reference_code == r.reference_code).one()
    rs.customer_cancel_reservation(db, res.reference_code, res.email)
    db.close()
    # A fresh identical booking (same email+date+time) must now succeed.
    successes, failures = _run_concurrent([_payload("rec@x.it", 2)])
    assert len(successes) == 1, f"rebooking after cancel failed: {failures}"
    assert _count_active("rec@x.it", DATE, "19:00") == 1


def test_8d_F_soft_deleted_then_identical_new_booking_succeeds():
    _seed_capacity(40)
    db = SessionLocal()
    r = rs.create_reservation(db, _payload("soft@x.it", 2))
    db.close()
    db = SessionLocal()
    res = db.query(Reservation).filter(Reservation.reference_code == r.reference_code).one()
    rs.soft_delete_reservation(db, res)
    db.close()
    successes, failures = _run_concurrent([_payload("soft@x.it", 2)])
    assert len(successes) == 1, f"rebooking after soft-delete failed: {failures}"
    assert _count_active("soft@x.it", DATE, "19:00") == 1


def test_8d_G_never_two_active_identical_reservations():
    # Fire several concurrent identical bookings repeatedly, resetting the table
    # before each burst. After each burst the invariant must hold that at most
    # one active identical reservation exists in the database.
    for _ in range(5):
        _seed_capacity(40)
        successes, failures = _run_concurrent([
            _payload("flood@x.it", 2),
            _payload("flood@x.it", 2),
            _payload("flood@x.it", 2),
        ])
        assert len(successes) == 1, f"expected exactly 1 success, got {len(successes)}: {failures}"
        assert _count_active("flood@x.it", DATE, "19:00") == 1
    # Regardless of how many concurrent bursts ran, only one active identical row can ever exist.
    assert _count_active("flood@x.it", DATE, "19:00") == 1
    assert _count_rows() == 1  # clean table: exactly the single surviving active reservation
