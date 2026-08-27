from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.deps import get_admin_user
from app.db.database import get_db
from app.models.user import User
from app.schemas.menu import (
    CategoryCreate,
    CategoryResponse,
    CategoryUpdate,
    MenuItemCreate,
    MenuItemResponse,
    MenuItemUpdate,
    MenuResponse,
)
from app.services import image_service, menu_service

router = APIRouter(prefix="/api/menu", tags=["menu"])

admin_router = APIRouter(prefix="/api/admin/menu", tags=["menu", "admin"])


@router.get("", response_model=MenuResponse)
def fetch_menu(db: Session = Depends(get_db)):
    return menu_service.get_menu(db)


@admin_router.get("", response_model=MenuResponse)
def list_menu_admin(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    return menu_service.get_admin_menu(db)


@admin_router.post("", response_model=MenuItemResponse, status_code=status.HTTP_201_CREATED)
def create_menu_item(
    data: MenuItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    try:
        item = menu_service.create_item(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return menu_service._item_to_dict(item)


@admin_router.put("/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    item_id: int,
    data: MenuItemUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    try:
        item = menu_service.update_item(db, item_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    return menu_service._item_to_dict(item)


@admin_router.get("/categories", response_model=list[CategoryResponse])
def list_categories_admin(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    return menu_service.get_admin_categories(db)


@admin_router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    data: CategoryCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    try:
        category = menu_service.create_category(db, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return menu_service._category_to_dict(category)


@admin_router.put("/categories/{category_id}", response_model=CategoryResponse)
def update_category(
    category_id: int,
    data: CategoryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    try:
        category = menu_service.update_category(db, category_id, data)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if category is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return menu_service._category_to_dict(category)


@admin_router.delete("/categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    try:
        deleted = menu_service.delete_category(db, category_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")


@admin_router.get("/allergens")
def list_allergen_catalog(db: Session = Depends(get_db), _: User = Depends(get_admin_user)):
    return menu_service.get_allergen_catalog(db)


@admin_router.post("/{item_id}/image", response_model=MenuItemResponse)
async def upload_menu_item_image(
    item_id: int,
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    if menu_service.get_item(db, item_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    try:
        image_url = await image_service.validate_and_save_image(image)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    return menu_service._item_to_dict(menu_service.set_item_image(db, item_id, image_url))


@admin_router.delete("/{item_id}/image", response_model=MenuItemResponse)
def remove_menu_item_image(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    if menu_service.get_item(db, item_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    item = menu_service.set_item_image(db, item_id, None)
    if item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
    return menu_service._item_to_dict(item)


@admin_router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_menu_item(
    item_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    deleted = menu_service.delete_item(db, item_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Menu item not found")
