"""add_plaid_items_accounts_transactions_chat_messages

Revision ID: a029f473de6e
Revises: 064bdc1f4d29
Create Date: 2026-05-04 01:54:55.212912

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a029f473de6e'
down_revision: Union[str, Sequence[str], None] = '064bdc1f4d29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = ["profiles", "plaid_items", "accounts", "transactions", "chat_messages"]


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "chat_messages",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("role IN ('user', 'assistant')", name="ck_chat_messages_role"),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_chat_messages_user_id_created_at", "chat_messages", ["user_id", "created_at"], unique=False)

    op.create_table(
        "plaid_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("plaid_item_id", sa.String(length=255), nullable=False),
        sa.Column("access_token", sa.String(length=512), nullable=False),
        sa.Column("institution_id", sa.String(length=100), nullable=True),
        sa.Column("institution_name", sa.String(length=255), nullable=True),
        sa.Column("cursor", sa.String(length=512), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("plaid_item_id", name="uq_plaid_items_plaid_item_id"),
    )
    op.create_index("ix_plaid_items_user_id", "plaid_items", ["user_id"], unique=False)

    op.create_table(
        "accounts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("plaid_item_id", sa.UUID(), nullable=True),
        sa.Column("plaid_account_id", sa.String(length=255), nullable=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("official_name", sa.String(length=255), nullable=True),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("subtype", sa.String(length=50), nullable=True),
        sa.Column("institution_name", sa.String(length=255), nullable=True),
        sa.Column("current_balance", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("available_balance", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("currency_code", sa.String(length=3), server_default="USD", nullable=False),
        sa.Column("mask", sa.String(length=10), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["plaid_item_id"], ["plaid_items.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("plaid_account_id", name="uq_accounts_plaid_account_id"),
    )
    op.create_index("ix_accounts_plaid_item_id", "accounts", ["plaid_item_id"], unique=False)
    op.create_index("ix_accounts_user_id", "accounts", ["user_id"], unique=False)

    op.create_table(
        "transactions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("account_id", sa.UUID(), nullable=True),
        sa.Column("plaid_transaction_id", sa.String(length=255), nullable=True),
        sa.Column("merchant_name", sa.String(length=255), nullable=False),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("category", sa.String(length=100), nullable=False),
        sa.Column("raw_category", sa.String(length=255), nullable=True),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("authorized_date", sa.Date(), nullable=True),
        sa.Column("pending", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("currency_code", sa.String(length=3), server_default="USD", nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["accounts.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["user_id"], ["profiles.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("plaid_transaction_id", name="uq_transactions_plaid_transaction_id"),
    )
    op.create_index("ix_transactions_account_id", "transactions", ["account_id"], unique=False)
    op.create_index("ix_transactions_user_category", "transactions", ["user_id", "category"], unique=False)
    op.create_index("ix_transactions_user_date", "transactions", ["user_id", "date"], unique=False)
    op.create_index("ix_transactions_user_id", "transactions", ["user_id"], unique=False)

    op.add_column("profiles", sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False))
    op.create_unique_constraint("uq_profiles_email", "profiles", ["email"])

    # ------------------------------------------------------------------ #
    # updated_at trigger — fires on every UPDATE, bypasses ORM dependency  #
    # ------------------------------------------------------------------ #
    op.execute("""
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
    """)
    for table in _TABLES:
        op.execute(f"""
            CREATE TRIGGER set_{table}_updated_at
            BEFORE UPDATE ON {table}
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """)

    # ------------------------------------------------------------------ #
    # Row Level Security                                                   #
    # ------------------------------------------------------------------ #
    for table in _TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;")

    # profiles — id IS the auth.uid()
    op.execute("""
        CREATE POLICY "profiles_select_own"
        ON profiles FOR SELECT
        USING (auth.uid() = id);
    """)
    op.execute("""
        CREATE POLICY "profiles_insert_own"
        ON profiles FOR INSERT
        WITH CHECK (auth.uid() = id);
    """)
    op.execute("""
        CREATE POLICY "profiles_update_own"
        ON profiles FOR UPDATE
        USING (auth.uid() = id)
        WITH CHECK (auth.uid() = id);
    """)

    # plaid_items — no UPDATE policy (backend service role only)
    op.execute("""
        CREATE POLICY "plaid_items_select_own"
        ON plaid_items FOR SELECT
        USING (auth.uid() = user_id);
    """)
    op.execute("""
        CREATE POLICY "plaid_items_insert_own"
        ON plaid_items FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    """)
    op.execute("""
        CREATE POLICY "plaid_items_delete_own"
        ON plaid_items FOR DELETE
        USING (auth.uid() = user_id);
    """)

    # accounts
    op.execute("""
        CREATE POLICY "accounts_select_own"
        ON accounts FOR SELECT
        USING (auth.uid() = user_id);
    """)
    op.execute("""
        CREATE POLICY "accounts_insert_own"
        ON accounts FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    """)

    # transactions
    op.execute("""
        CREATE POLICY "transactions_select_own"
        ON transactions FOR SELECT
        USING (auth.uid() = user_id);
    """)
    op.execute("""
        CREATE POLICY "transactions_insert_own"
        ON transactions FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    """)
    op.execute("""
        CREATE POLICY "transactions_update_own"
        ON transactions FOR UPDATE
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    """)

    # chat_messages
    op.execute("""
        CREATE POLICY "chat_messages_select_own"
        ON chat_messages FOR SELECT
        USING (auth.uid() = user_id);
    """)
    op.execute("""
        CREATE POLICY "chat_messages_insert_own"
        ON chat_messages FOR INSERT
        WITH CHECK (auth.uid() = user_id);
    """)

    # ------------------------------------------------------------------ #
    # Auto-create profile row when a new Supabase Auth user signs up       #
    # ------------------------------------------------------------------ #
    op.execute("""
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS TRIGGER AS $$
        BEGIN
            INSERT INTO public.profiles (id, email, full_name)
            VALUES (
                NEW.id,
                NEW.email,
                NEW.raw_user_meta_data->>'full_name'
            )
            ON CONFLICT (id) DO NOTHING;
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    """)
    op.execute("""
        CREATE OR REPLACE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    """)


def downgrade() -> None:
    """Downgrade schema."""
    # Auth signup trigger
    op.execute("DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;")
    op.execute("DROP FUNCTION IF EXISTS public.handle_new_user();")

    # RLS policies
    for policy, table in [
        ("chat_messages_insert_own", "chat_messages"),
        ("chat_messages_select_own", "chat_messages"),
        ("transactions_update_own", "transactions"),
        ("transactions_insert_own", "transactions"),
        ("transactions_select_own", "transactions"),
        ("accounts_insert_own", "accounts"),
        ("accounts_select_own", "accounts"),
        ("plaid_items_delete_own", "plaid_items"),
        ("plaid_items_insert_own", "plaid_items"),
        ("plaid_items_select_own", "plaid_items"),
        ("profiles_update_own", "profiles"),
        ("profiles_insert_own", "profiles"),
        ("profiles_select_own", "profiles"),
    ]:
        op.execute(f'DROP POLICY IF EXISTS "{policy}" ON {table};')

    for table in reversed(_TABLES):
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;")

    # updated_at triggers
    for table in reversed(_TABLES):
        op.execute(f"DROP TRIGGER IF EXISTS set_{table}_updated_at ON {table};")
    op.execute("DROP FUNCTION IF EXISTS update_updated_at_column();")

    # profiles column + constraint
    op.drop_constraint("uq_profiles_email", "profiles", type_="unique")
    op.drop_column("profiles", "updated_at")

    # tables in reverse FK dependency order
    op.drop_index("ix_transactions_user_id", table_name="transactions")
    op.drop_index("ix_transactions_user_date", table_name="transactions")
    op.drop_index("ix_transactions_user_category", table_name="transactions")
    op.drop_index("ix_transactions_account_id", table_name="transactions")
    op.drop_table("transactions")

    op.drop_index("ix_accounts_user_id", table_name="accounts")
    op.drop_index("ix_accounts_plaid_item_id", table_name="accounts")
    op.drop_table("accounts")

    op.drop_index("ix_plaid_items_user_id", table_name="plaid_items")
    op.drop_table("plaid_items")

    op.drop_index("ix_chat_messages_user_id_created_at", table_name="chat_messages")
    op.drop_table("chat_messages")
