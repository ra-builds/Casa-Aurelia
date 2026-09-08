from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_admin_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.restaurant import RestaurantResponse, RestaurantUpdate
from app.services.restaurant_service import get_or_create_restaurant, get_restaurant, update_restaurant

router = APIRouter(prefix="/api/restaurant", tags=["restaurant"])
admin_router = APIRouter(prefix="/api/admin/restaurant", tags=["restaurant-admin"])


@router.get("", response_model=RestaurantResponse)
def fetch_restaurant(db: Session = Depends(get_db)):
    restaurant = get_restaurant(db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant configuration not found")
    return restaurant


@admin_router.get("", response_model=RestaurantResponse)
def admin_fetch_restaurant(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return get_or_create_restaurant(db)


@admin_router.patch("", response_model=RestaurantResponse)
def admin_update_restaurant(
    data: RestaurantUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return update_restaurant(db, data)
