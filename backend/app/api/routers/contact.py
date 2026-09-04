from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_admin_user
from app.db.database import get_db
from app.models.message import Message
from app.models.restaurant import Restaurant
from app.models.user import User
from app.schemas.contact import ContactCreate, ContactMessageResponse, ContactSubmitResponse
from app.services import email_service
from app.api.routers.reservations import limiter

router = APIRouter(prefix="/api/contact", tags=["contact"])


@router.post(
    "",
    response_model=ContactSubmitResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("5/minute")
def submit_contact(
    request: Request,
    data: ContactCreate,
    db: Session = Depends(get_db),
):
    """Accept a contact-form submission: store it and best-effort notify the owner.

    The message is always persisted so a submission is never lost even when email
    is not configured or the send fails. The response reports both storage and the
    delivery outcome honestly.
    """
    message = Message(
        name=data.name.strip(),
        email=data.email.lower(),
        subject=data.subject.strip(),
        message=data.message.strip(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)

    restaurant = db.query(Restaurant).first()
    result = email_service.send_contact_notification(
        name=message.name,
        email=message.email,
        subject=message.subject,
        message=message.message,
        restaurant_email=restaurant.email if restaurant else None,
    )

    return ContactSubmitResponse(
        id=message.id,
        stored=True,
        email_sent=result.success,
    )


@router.get("/messages", response_model=list[ContactMessageResponse])
def list_contact_messages(
    db: Session = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    return (
        db.query(Message)
        .order_by(Message.created_at.desc())
        .all()
    )
