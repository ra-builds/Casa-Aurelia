from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.orm import Session

from app.core.deps import get_admin_user
from app.db.database import get_db
from app.models.reservation import Reservation
from app.models.user import User
from app.schemas.reservation import (
    VALID_TIME_SLOTS,
    AvailabilityResponse,
    PaginatedReservationResponse,
    ReservationCreate,
    ReservationLookup,
    ReservationResponse,
    ReservationStats,
    ReservationUpdate,
)
from app.services import reservation_service
from app.services.reservation_service import AlreadyCancelledError

router = APIRouter(prefix="/api/reservations", tags=["reservations"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/availability", response_model=AvailabilityResponse)
@limiter.limit("30/minute")
def check_availability(
    request: Request,
    date: date = Query(..., alias="date"),
    time: str = Query(..., alias="time"),
    guests: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
):
    # The create contract (ReservationCreate.validate_time_slot) only accepts the
    # defined VALID_TIME_SLOTS and rejects everything else with 422. The
    # availability endpoint must mirror that so it never reports a time slot as
    # bookable that can actually never be reserved (and never turns a malformed
    # slot, e.g. "25:99", into an unhandled 500).
    if time not in VALID_TIME_SLOTS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Time must be one of: {', '.join(VALID_TIME_SLOTS)}",
        )

    result = reservation_service.check_availability(db, date, time, guests)
    return AvailabilityResponse(**result)


@router.post("", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/minute")
def create_reservation(request: Request, data: ReservationCreate, db: Session = Depends(get_db)):
    try:
        reservation = reservation_service.create_reservation(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    return reservation_service.reservation_to_response(reservation)


@router.get("", response_model=PaginatedReservationResponse)
def list_reservations(
    search: str | None = None,
    status: str | None = None,
    date: date | None = Query(default=None, alias="date"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    items, total = reservation_service.get_reservations(db, search, status, date, page, page_size)
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedReservationResponse(
        items=[reservation_service.reservation_to_response(r) for r in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/stats", response_model=ReservationStats)
def reservation_stats(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    return reservation_service.get_stats(db)


@router.post("/lookup", response_model=ReservationResponse)
@limiter.limit("10/minute")
def lookup_reservation(request: Request, data: ReservationLookup, db: Session = Depends(get_db)):
    reservation = reservation_service.lookup_reservation(db, data.reference_code, data.email)
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found. Please check your reference code and email.")
    return reservation_service.reservation_to_response(reservation)


@router.post("/customer/cancel", response_model=ReservationResponse)
@limiter.limit("10/minute")
def customer_cancel_reservation(request: Request, data: ReservationLookup, db: Session = Depends(get_db)):
    try:
        reservation = reservation_service.customer_cancel_reservation(db, data.reference_code, data.email)
    except AlreadyCancelledError as e:
        # The reservation exists but is already cancelled -> a state conflict
        # (409), not a missing resource (404).
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return reservation_service.reservation_to_response(reservation)


@router.get("/{reservation_id}", response_model=ReservationResponse)
def get_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    reservation = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.deleted_at.is_(None),
    ).first()
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    return reservation_service.reservation_to_response(reservation)


@router.patch("/{reservation_id}", response_model=ReservationResponse)
def update_reservation(
    reservation_id: int,
    data: ReservationUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    reservation = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.deleted_at.is_(None),
    ).first()
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")

    try:
        updated = reservation_service.update_reservation(db, reservation, data)
    except ValueError as e:
        # e.g. reactivating a cancelled reservation that would exceed capacity.
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
    return reservation_service.reservation_to_response(updated)


@router.delete("/{reservation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reservation(
    reservation_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    reservation = db.query(Reservation).filter(
        Reservation.id == reservation_id,
        Reservation.deleted_at.is_(None),
    ).first()
    if not reservation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reservation not found")
    reservation_service.soft_delete_reservation(db, reservation)
