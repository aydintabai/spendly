import uuid
from decimal import Decimal
from sqlalchemy import String, UUID, ForeignKey, Numeric, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class Account(Base, TimestampMixin):
    __tablename__ = "accounts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    plaid_item_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("plaid_items.id", ondelete="SET NULL"), nullable=True
    )
    plaid_account_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    official_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Plaid type taxonomy: depository, credit, loan, investment, other
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    subtype: Mapped[str | None] = mapped_column(String(50), nullable=True)
    institution_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_balance: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    available_balance: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, server_default="USD")
    # Last 4 digits of account number for display
    mask: Mapped[str | None] = mapped_column(String(10), nullable=True)
    is_active: Mapped[bool] = mapped_column(nullable=False, server_default="true")

    user: Mapped["Profile"] = relationship("Profile", back_populates="accounts")
    plaid_item: Mapped["PlaidItem | None"] = relationship("PlaidItem", back_populates="accounts")
    transactions: Mapped[list["Transaction"]] = relationship(
        "Transaction", back_populates="account", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_accounts_user_id", "user_id"),
        Index("ix_accounts_plaid_item_id", "plaid_item_id"),
    )
