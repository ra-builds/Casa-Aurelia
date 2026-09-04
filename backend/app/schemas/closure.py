from datetime import date, datetime

from pydantic import BaseModel, Field


class ClosureCreate(BaseModel):
    closure_date: date
    reason: str | None = Field(default=None, max_length=200)


class ClosureResponse(BaseModel):
    id: int
    closure_date: date
    reason: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
