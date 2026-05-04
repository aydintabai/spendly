import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class ProfileCreate(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None = None


class ProfileRead(BaseModel):
    id: uuid.UUID
    email: str
    full_name: str | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
