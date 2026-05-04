import uuid
from datetime import date
from decimal import Decimal
from sqlalchemy import String, UUID, ForeignKey, Numeric, Date, Boolean, Index, UniqueConstraint, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class Transaction(Base, TimestampMixin):
    __tablename__ = "transactions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), nullable=False
    )
    account_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True
    )
    plaid_transaction_id: Mapped[str | None] = mapped_column(String(255), nullable=True, unique=True)
    merchant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Positive = expense/debit, negative = income — matches Plaid convention
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    category: Mapped[str] = mapped_column(String(100), nullable=False)
    # Plaid's raw detailed_category before mapping to Spendly's category enum
    raw_category: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    authorized_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    pending: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    currency_code: Mapped[str] = mapped_column(String(3), nullable=False, server_default="USD")
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["Profile"] = relationship("Profile", back_populates="transactions")
    account: Mapped["Account | None"] = relationship("Account", back_populates="transactions")

    __table_args__ = (
        Index("ix_transactions_user_id", "user_id"),
        Index("ix_transactions_user_date", "user_id", "date"),
        Index("ix_transactions_user_category", "user_id", "category"),
        Index("ix_transactions_account_id", "account_id"),
        UniqueConstraint("plaid_transaction_id", name="uq_transactions_plaid_transaction_id"),
    )
