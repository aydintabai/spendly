import uuid
from sqlalchemy import String, UUID, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class PlaidItem(Base, TimestampMixin):
    __tablename__ = "plaid_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    plaid_item_id: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    access_token: Mapped[str] = mapped_column(String(512), nullable=False)
    institution_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    institution_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Plaid transactions/sync cursor — store to enable incremental pulls
    cursor: Mapped[str | None] = mapped_column(String(512), nullable=True)

    user: Mapped["Profile"] = relationship("Profile", back_populates="plaid_items")
    accounts: Mapped[list["Account"]] = relationship(
        "Account", back_populates="plaid_item", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_plaid_items_user_id", "user_id"),
        UniqueConstraint("plaid_item_id", name="uq_plaid_items_plaid_item_id"),
    )
