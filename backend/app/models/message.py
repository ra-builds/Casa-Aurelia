from datetime import datetime, timezone

from sqlalchemy import DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Message(Base):
    """A contact-form message submitted through the public contact form.

    Stored so contact submissions are genuinely retained and retrievable by an
    admin, complementing (never replacing) the best-effort owner notification
    email. Email delivery failures do not discard the message.
    """

    __tablename__ = "contact_messages"
    __table_args__ = (
        Index("ix_contact_messages_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    subject: Mapped[str] = mapped_column(String(200), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
