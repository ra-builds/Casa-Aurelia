import logging
import secrets
from datetime import date, datetime, time, timezone

from sqlalchemy import func, insert, literal, select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.reservation import Reservation
from app.models.restaurant import Restaurant
from app.schemas.reservation import ReservationCreate, ReservationLookup, ReservationStats, ReservationUpdate
from app.services.restaurant_service import get_capacity, get_restaurant

logger = logging.getLogger(__name__)
settings = get_settings()

WEEKDAY_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}


def is_closed_day(reservation_date: date, closed_day: str) -> bool:
    day_index = WEEKDAY_MAP.get(closed_day.strip().lower(), -1)
    return day_index != -1 and reservation_date.weekday() == day_index


def _parse_time(time_str: str) -> time:
    hour, minute = map(int, time_str.split(":"))
    return time(hour, minute)


def _format_time(t: time) -> str:
    return t.strftime("%H:%M")


def generate_reference_code() -> str:
    return f"CASA-{secrets.token_hex(3).upper()}"


def get_booked_guests(db: Session, reservation_date: date, reservation_time: str) -> int:
    parsed_time = _parse_time(reservation_time)
    result = (
        db.query(func.coalesce(func.sum(Reservation.guests), 0))
        .filter(
            Reservation.reservation_date == reservation_date,
            Reservation.reservation_time == parsed_time,
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        )
        .scalar()
    )
    return int(result or 0)


def check_availability(db: Session, reservation_date: date, reservation_time: str, guests: int) -> dict:
    restaurant = get_restaurant(db)
    if restaurant and is_closed_day(reservation_date, restaurant.closed_day):
        return {
            "available": False,
            "remaining_capacity": 0,
            "message": f"Restaurant is closed on {restaurant.closed_day}s.",
        }

    booked = get_booked_guests(db, reservation_date, reservation_time)
    capacity = get_capacity(db)
    remaining = capacity - booked
    available = guests <= remaining

    if available:
        message = f"{remaining} seats available for this time slot"
    else:
        message = f"Only {max(remaining, 0)} seats remaining. Please choose another time."

    return {
        "available": available,
        "remaining_capacity": max(remaining, 0),
        "message": message,
    }


def _active_guests_subquery(reservation_date: date, reservation_time: time):
    """Scalar subquery for the total active (non-cancelled, non-deleted) guest count."""
    return (
        select(func.coalesce(func.sum(Reservation.guests), 0))
        .where(
            Reservation.reservation_date == literal(reservation_date),
            Reservation.reservation_time == literal(reservation_time),
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        )
        .scalar_subquery()
    )


def _capacity_ok_condition(reservation_date: date, reservation_time: time, guests: int):
    """Boolean condition that the requested guests fit within remaining capacity.

    Reads the restaurant capacity through a correlated scalar subquery so the
    whole capacity check and the row insert are evaluated as one atomic write
    statement under SQLite's single-writer WAL serialization.
    """
    capacity = (
        select(func.coalesce(func.max(Restaurant.capacity), 0))
        .scalar_subquery()
    )
    booked = _active_guests_subquery(reservation_date, reservation_time)
    return guests <= (capacity - booked)


def _duplicate_ok_condition(email: str, reservation_date: date, reservation_time: time):
    """Boolean condition that NO *active* reservation already exists for this
    email + date + time.

    Mirrors `check_duplicate_reservation`: cancelled and soft-deleted rows are
    excluded, so a customer may legitimately book again after cancelling or after
    an admin soft-deletes their earlier reservation. When combined into the single
    INSERT ... SELECT ... WHERE statement, this condition is re-evaluated against
    committed rows at write time, closing the concurrent-duplicate race without a
    unique index / migration and in a way that also holds on PostgreSQL.
    """
    duplicate_exists = (
        select(Reservation.id)
        .where(
            Reservation.email == literal(email),
            Reservation.reservation_date == literal(reservation_date),
            Reservation.reservation_time == literal(reservation_time),
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        )
        .exists()
    )
    return ~duplicate_exists


def create_reservation(db: Session, data: ReservationCreate) -> Reservation:
    restaurant = get_restaurant(db)
    if restaurant and is_closed_day(data.reservation_date, restaurant.closed_day):
        raise ValueError(f"Reservations are not accepted on {restaurant.closed_day}s.")

    if check_duplicate_reservation(db, data.email, data.reservation_date, data.reservation_time):
        raise ValueError("You already have a reservation for this date and time.")

    parsed_time = _parse_time(data.reservation_time)
    now = datetime.now(timezone.utc)
    reservation = Reservation(
        reference_code=generate_reference_code(),
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        email=data.email.lower(),
        phone=data.phone,
        reservation_date=data.reservation_date,
        reservation_time=parsed_time,
        guests=data.guests,
        special_requests=data.special_requests,
        status="pending",
    )

    # Genuinely atomic capacity reservation.
    #
    # The Phase 7D implementation used a SAVEPOINT (begin_nested) around an
    # UNLOCKED SELECT-then-INSERT. A SAVEPOINT only guarantees atomic rollback,
    # not isolation from concurrent writers, so two concurrent requests could
    # both read the same "booked" count and both pass the capacity check,
    # oversubscribing the restaurant.
    #
    # Instead we perform a single INSERT ... SELECT ... WHERE (capacity_ok) so
    # that the capacity check and the insertion are ONE write statement.
    # SQLite (WAL) serializes writers: the second concurrent statement only
    # runs after the first commits, at which point its re-read of the active
    # guest sum observes the committed rows, so the WHERE evaluates false and
    # exactly one request succeeds. This requires no schema change and is also
    # portable to PostgreSQL (the same single-statement semantics hold there).
    #
    # Phase 8D: the WHERE clause additionally requires that NO active (non-
    # cancelled, non-deleted) reservation already exists for this email + date +
    # time (_duplicate_ok_condition). Under the same WAL single-writer
    # serialization, two concurrent identical requests serialize; the second
    # re-reads the first's committed row, the duplicate guard fails, and it
    # inserts 0 rows. This closes the concurrent-duplicate race without a unique
    # index / migration, while deliberately not blocking re-bookings after a
    # cancellation or soft-delete.
    capacity_src = select(
        literal(reservation.reference_code).label("reference_code"),
        literal(reservation.first_name).label("first_name"),
        literal(reservation.last_name).label("last_name"),
        literal(reservation.email).label("email"),
        literal(reservation.phone).label("phone"),
        literal(reservation.reservation_date).label("reservation_date"),
        literal(reservation.reservation_time).label("reservation_time"),
        literal(reservation.guests).label("guests"),
        literal(reservation.special_requests).label("special_requests"),
        literal(reservation.status).label("status"),
        literal(now).label("created_at"),
        literal(now).label("updated_at"),
        literal(None).label("deleted_at"),
    ).where(
        _capacity_ok_condition(data.reservation_date, parsed_time, data.guests),
        _duplicate_ok_condition(data.email.lower(), data.reservation_date, parsed_time),
    )

    stmt = insert(Reservation.__table__).from_select(
        [
            Reservation.reference_code,
            Reservation.first_name,
            Reservation.last_name,
            Reservation.email,
            Reservation.phone,
            Reservation.reservation_date,
            Reservation.reservation_time,
            Reservation.guests,
            Reservation.special_requests,
            Reservation.status,
            Reservation.created_at,
            Reservation.updated_at,
            Reservation.deleted_at,
        ],
        capacity_src,
    )

    result = db.execute(stmt)
    if result.rowcount == 0:
        # The atomic guard rejected the insert (capacity race). Distinguish the
        # reason for a user-safe message, re-checking the committed state.
        if check_duplicate_reservation(db, data.email, data.reservation_date, data.reservation_time):
            raise ValueError("You already have a reservation for this date and time.")
        booked = get_booked_guests(db, data.reservation_date, data.reservation_time)
        capacity = get_capacity(db)
        raise ValueError(f"Only {max(capacity - booked, 0)} seats remaining. Please choose another time.")

    db.commit()

    reservation = (
        db.query(Reservation)
        .filter(Reservation.reference_code == reservation.reference_code)
        .one()
    )

    logger.info(
        "Confirmation email (mock) sent to %s for reservation %s",
        reservation.email,
        reservation.reference_code,
    )

    return reservation


def lookup_reservation(db: Session, reference_code: str, email: str) -> Reservation | None:
    normalized_email = email.strip().lower()
    normalized_ref = reference_code.strip().upper()
    return (
        db.query(Reservation)
        .filter(
            Reservation.reference_code == normalized_ref,
            Reservation.email == normalized_email,
            Reservation.deleted_at.is_(None),
        )
        .first()
    )


def customer_cancel_reservation(db: Session, reference_code: str, email: str) -> Reservation:
    reservation = lookup_reservation(db, reference_code, email)
    if not reservation:
        raise ValueError("Reservation not found. Please check your reference code and email.")
    if reservation.status == "cancelled":
        raise ValueError("This reservation has already been cancelled.")
    reservation.status = "cancelled"
    reservation.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(reservation)
    return reservation


def check_duplicate_reservation(db: Session, email: str, reservation_date: date, reservation_time: str) -> bool:
    normalized_email = email.strip().lower()
    parsed_time = _parse_time(reservation_time)
    existing = (
        db.query(Reservation)
        .filter(
            Reservation.email == normalized_email,
            Reservation.reservation_date == reservation_date,
            Reservation.reservation_time == parsed_time,
            Reservation.status != "cancelled",
            Reservation.deleted_at.is_(None),
        )
        .first()
    )
    return existing is not None


def reservation_to_response(reservation: Reservation) -> dict:
    return {
        "id": reservation.id,
        "reference_code": reservation.reference_code,
        "first_name": reservation.first_name,
        "last_name": reservation.last_name,
        "email": reservation.email,
        "phone": reservation.phone,
        "reservation_date": reservation.reservation_date,
        "reservation_time": _format_time(reservation.reservation_time),
        "guests": reservation.guests,
        "special_requests": reservation.special_requests,
        "status": reservation.status,
        "created_at": reservation.created_at,
        "updated_at": reservation.updated_at,
    }


def get_reservations(
    db: Session,
    search: str | None = None,
    status: str | None = None,
    date_filter: date | None = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Reservation], int]:
    query = db.query(Reservation).filter(Reservation.deleted_at.is_(None)).order_by(
        Reservation.reservation_date.desc(),
        Reservation.reservation_time.desc(),
    )

    if search:
        term = f"%{search.lower()}%"
        query = query.filter(
            (func.lower(Reservation.first_name).like(term))
            | (func.lower(Reservation.last_name).like(term))
            | (func.lower(Reservation.email).like(term))
            | (func.lower(Reservation.reference_code).like(term))
            | (Reservation.phone.like(term))
        )

    if status:
        query = query.filter(Reservation.status == status)

    if date_filter:
        query = query.filter(Reservation.reservation_date == date_filter)

    total = query.count()
    offset = (page - 1) * page_size
    items = query.offset(offset).limit(page_size).all()

    return items, total


def update_reservation(db: Session, reservation: Reservation, data: ReservationUpdate) -> Reservation:
    if data.status is not None:
        reservation.status = data.status
    if data.special_requests is not None:
        reservation.special_requests = data.special_requests
    reservation.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(reservation)
    return reservation


def soft_delete_reservation(db: Session, reservation: Reservation) -> None:
    reservation.deleted_at = datetime.now(timezone.utc)
    reservation.updated_at = datetime.now(timezone.utc)
    db.commit()


def get_stats(db: Session) -> ReservationStats:
    base_query = db.query(Reservation).filter(Reservation.deleted_at.is_(None))
    today = date.today()
    total = base_query.count()
    today_reservations = base_query.filter(Reservation.reservation_date == today).all()
    today_count = len(today_reservations)
    today_guests = sum(r.guests for r in today_reservations if r.status != "cancelled")
    upcoming = (
        base_query
        .filter(Reservation.reservation_date >= today, Reservation.status != "cancelled")
        .count()
    )
    pending = base_query.filter(Reservation.status == "pending").count()
    confirmed = base_query.filter(Reservation.status == "confirmed").count()
    cancelled = base_query.filter(Reservation.status == "cancelled").count()

    return ReservationStats(
        total=total,
        today_count=today_count,
        today_guests=today_guests,
        upcoming=upcoming,
        pending=pending,
        confirmed=confirmed,
        cancelled=cancelled,
    )
