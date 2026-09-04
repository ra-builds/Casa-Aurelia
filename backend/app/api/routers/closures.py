from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_admin_user
from app.db.database import get_db
from app.models.closure import Closure
from app.models.user import User
from app.schemas.closure import ClosureCreate, ClosureResponse

# Public listing (used by the booking flow / frontend to surface holiday closures)
# and an admin-management router (create/list/delete). The admin routes live under
# /api/admin/closures and are gated by get_admin_user.
router = APIRouter(prefix="/api/closures", tags=["closures"])
admin_router = APIRouter(prefix="/api/admin/closures", tags=["closures-admin"])


@router.get("", response_model=list[ClosureResponse])
def list_closures(db: Session = Depends(get_db)):
    return db.query(Closure).order_by(Closure.closure_date).all()


@admin_router.get("", response_model=list[ClosureResponse])
def admin_list_closures(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return db.query(Closure).order_by(Closure.closure_date).all()


@admin_router.post(
    "",
    response_model=ClosureResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_closure(
    data: ClosureCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    existing = db.query(Closure).filter(Closure.closure_date == data.closure_date).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A closure already exists for this date.",
        )
    closure = Closure(closure_date=data.closure_date, reason=data.reason)
    db.add(closure)
    db.commit()
    db.refresh(closure)
    return closure


@admin_router.delete("/{closure_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_closure(
    closure_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    closure = db.query(Closure).filter(Closure.id == closure_id).first()
    if not closure:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Closure not found")
    db.delete(closure)
    db.commit()
