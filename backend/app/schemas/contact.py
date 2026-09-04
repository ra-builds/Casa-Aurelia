from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class ContactCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    email: EmailStr
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=10, max_length=4000)


class ContactMessageResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    subject: str
    message: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ContactSubmitResponse(BaseModel):
    id: int
    stored: bool = True
    email_sent: bool = False
