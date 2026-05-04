from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, UUID
import uuid
from app.models.base import Base, TimestampMixin

class Profile(Base, TimestampMixin):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)