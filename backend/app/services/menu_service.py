import re
import unicodedata
from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.allergen import Allergen
from app.models.category import Category
from app.models.menu_item import MenuItem
from app.schemas.menu import CategoryCreate, CategoryUpdate, MenuItemCreate, MenuItemUpdate
from app.services import image_service

SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


def _slugify(name: str) -> str:
    normalized = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"-{2,}", "-", re.sub(r"[^a-z0-9]+", "-", normalized.lower())).strip("-")


def _validate_slug_format(slug: str) -> None:
    if len(slug) > 100 or not SLUG_PATTERN.match(slug):
        raise ValueError("Invalid slug. Use lowercase letters, numbers, and hyphens (e.g. 'seasonal-specials').")


def _category_to_dict(category: Category) -> dict:
    return {
        "id": category.id,
        "name": category.name,
        "slug": category.slug,
        "sort_order": category.sort_order,
    }


def get_admin_categories(db: Session) -> list[Category]:
    return db.query(Category).order_by(Category.sort_order, Category.name).all()


def create_category(db: Session, data: CategoryCreate) -> Category:
    name = data.name.strip()
    if not name:
        raise ValueError("Category name cannot be empty.")
    if db.query(Category).filter(Category.name == name).first():
        raise ValueError(f"A category named '{name}' already exists.")

    if data.slug:
        slug = data.slug.strip().lower()
        _validate_slug_format(slug)
    else:
        slug = _slugify(name) or f"category-{int(datetime.now(timezone.utc).timestamp())}"
    if db.query(Category).filter(Category.slug == slug).first():
        raise ValueError(f"A category with slug '{slug}' already exists.")

    sort_order = data.sort_order
    if not sort_order:
        max_order = db.query(Category).order_by(Category.sort_order.desc()).first()
        sort_order = (max_order.sort_order + 1) if max_order else 1

    category = Category(name=name, slug=slug, sort_order=sort_order)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


def update_category(db: Session, category_id: int, data: CategoryUpdate) -> Category | None:
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        return None

    changes = data.model_dump(exclude_unset=True)

    if "name" in changes:
        name = changes["name"].strip()
        if not name:
            raise ValueError("Category name cannot be empty.")
        clash = db.query(Category).filter(Category.name == name, Category.id != category_id).first()
        if clash:
            raise ValueError(f"A category named '{name}' already exists.")
        changes["name"] = name

    if "slug" in changes and changes["slug"]:
        slug = _slugify(changes["slug"])
        _validate_slug_format(slug)
        clash = db.query(Category).filter(Category.slug == slug, Category.id != category_id).first()
        if clash:
            raise ValueError(f"A category with slug '{slug}' already exists.")
        changes["slug"] = slug

    for field, value in changes.items():
        setattr(category, field, value)

    category.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(category)
    return category


def delete_category(db: Session, category_id: int) -> bool:
    """Delete an empty category.

    Refuses to delete a category that still contains menu items — the
    database-level ON DELETE CASCADE on menu_items.category_id would
    otherwise silently destroy every item inside it.
    """
    category = db.query(Category).filter(Category.id == category_id).first()
    if category is None:
        return False

    item_count = db.query(MenuItem).filter(MenuItem.category_id == category_id).count()
    if item_count:
        raise ValueError(
            f"Cannot delete '{category.name}': it contains {item_count} menu item(s). "
            "Move or delete its menu items first."
        )

    db.delete(category)
    db.commit()
    return True


def _resolve_allergens(db: Session, codes: list[str]) -> list[Allergen]:
    """Validate submitted codes against the controlled catalog.

    Duplicates are normalized; any unknown code raises ValueError.
    """
    unique_codes = sorted({code.strip().upper() for code in codes if code and code.strip()})
    if not unique_codes:
        return []
    found = db.query(Allergen).filter(Allergen.code.in_(unique_codes)).all()
    found_codes = {a.code for a in found}
    unknown = [code for code in unique_codes if code not in found_codes]
    if unknown:
        raise ValueError(f"Unknown allergen code(s): {', '.join(unknown)}")
    return sorted(found, key=lambda a: a.code)


def _apply_allergens(db: Session, item: MenuItem, codes: list[str]) -> None:
    item.allergens = _resolve_allergens(db, codes)


def _item_to_dict(item: MenuItem) -> dict:
    return {
        "id": item.id,
        "category_id": item.category_id,
        "name": item.name,
        "description": item.description,
        "price": float(item.price),
        "dietary_info": item.dietary_info,
        "image_url": item.image_url,
        "is_featured": item.is_featured,
        "is_available": item.is_available,
        "sort_order": item.sort_order,
        "category": item.category,
        "allergens": [{"code": a.code, "name": a.name} for a in item.allergens],
    }


def get_menu(db: Session) -> dict:
    categories = db.query(Category).order_by(Category.sort_order).all()
    items = (
        db.query(MenuItem)
        .options(joinedload(MenuItem.category), selectinload(MenuItem.allergens))
        .order_by(MenuItem.sort_order)
        .all()
    )

    return {
        "categories": categories,
        "items": [_item_to_dict(item) for item in items],
    }


def get_admin_menu(db: Session) -> dict:
    categories = db.query(Category).order_by(Category.sort_order).all()
    items = (
        db.query(MenuItem)
        .options(joinedload(MenuItem.category), selectinload(MenuItem.allergens))
        .order_by(MenuItem.category_id, MenuItem.sort_order)
        .all()
    )

    return {
        "categories": categories,
        "items": [_item_to_dict(item) for item in items],
    }


def get_allergen_catalog(db: Session) -> list[dict]:
    return [{"code": a.code, "name": a.name} for a in db.query(Allergen).order_by(Allergen.code).all()]


def create_item(db: Session, data: MenuItemCreate) -> MenuItem:
    category = db.query(Category).filter(Category.id == data.category_id).first()
    if category is None:
        raise ValueError("Category not found")

    changes = data.model_dump()
    allergen_codes = changes.pop("allergen_codes")
    item = MenuItem(**changes)
    db.add(item)
    db.flush()
    _apply_allergens(db, item, allergen_codes)
    db.commit()
    db.refresh(item)
    return item


def update_item(db: Session, item_id: int, data: MenuItemUpdate) -> MenuItem | None:
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if item is None:
        return None

    changes = data.model_dump(exclude_unset=True)
    if "category_id" in changes:
        category = db.query(Category).filter(Category.id == changes["category_id"]).first()
        if category is None:
            raise ValueError("Category not found")

    allergen_codes = changes.pop("allergen_codes", None)
    for field, value in changes.items():
        setattr(item, field, value)

    item.updated_at = datetime.now(timezone.utc)
    if allergen_codes is not None:
        _apply_allergens(db, item, allergen_codes)
    db.commit()
    db.refresh(item)
    return item


def get_item(db: Session, item_id: int) -> MenuItem | None:
    return db.query(MenuItem).filter(MenuItem.id == item_id).first()


def set_item_image(db: Session, item_id: int, image_url: str | None) -> MenuItem | None:
    """Replace or clear a menu item's image.

    The new URL is committed first; only then is the previously managed file
    removed, so a crash can leave an orphan file but never a broken reference.
    """
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if item is None:
        return None

    previous_url = item.image_url
    item.image_url = image_url
    item.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(item)

    if previous_url and previous_url != image_url:
        image_service.delete_managed_image(previous_url)
    return item


def delete_item(db: Session, item_id: int) -> bool:
    item = db.query(MenuItem).filter(MenuItem.id == item_id).first()
    if item is None:
        return False

    orphan_url = item.image_url
    db.delete(item)
    db.commit()
    if orphan_url:
        image_service.delete_managed_image(orphan_url)
    return True
