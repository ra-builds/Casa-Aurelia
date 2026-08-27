from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.schemas.restaurant import RestaurantResponse
from app.services.restaurant_service import get_restaurant

router = APIRouter(prefix="/api/restaurant", tags=["restaurant"])


@router.get("", response_model=RestaurantResponse)
def fetch_restaurant(db: Session = Depends(get_db)):
    restaurant = get_restaurant(db)
    if not restaurant:
        raise HTTPException(status_code=404, detail="Restaurant configuration not found")
    return restaurant
