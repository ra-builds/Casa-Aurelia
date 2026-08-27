from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base

menu_item_allergens = Table(
    "menu_item_allergens",
    Base.metadata,
    Column(
        "menu_item_id",
        Integer,
        ForeignKey("menu_items.id", ondelete="CASCADE", name="fk_menu_item_allergens_menu_item_id_menu_items"),
        primary_key=True,
    ),
    Column(
        "allergen_id",
        Integer,
        ForeignKey("allergens.id", ondelete="CASCADE", name="fk_menu_item_allergens_allergen_id_allergens"),
        primary_key=True,
    ),
)


class Allergen(Base):
    __tablename__ = "allergens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    menu_items: Mapped[list["MenuItem"]] = relationship(
        secondary=menu_item_allergens, back_populates="allergens"
    )


from app.models.menu_item import MenuItem  # noqa: E402
