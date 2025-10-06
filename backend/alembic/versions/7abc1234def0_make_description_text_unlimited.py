"""Make description TEXT and drop length constraint

Revision ID: 7abc1234def0
Revises: 93ea0dd8cf53
Create Date: 2025-10-06
"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "7abc1234def0"
down_revision = "93ea0dd8cf53"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Idempotent: only alter if not already TEXT; drop constraint if exists
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'competitions' AND column_name = 'description' AND data_type <> 'text'
            ) THEN
                ALTER TABLE competitions ALTER COLUMN description TYPE TEXT;
            END IF;
        END$$;
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'ck_description_length'
            ) THEN
                ALTER TABLE competitions DROP CONSTRAINT ck_description_length;
            END IF;
        END$$;
        """
    )


def downgrade() -> None:
    op.execute("ALTER TABLE competitions ALTER COLUMN description TYPE VARCHAR(8000)")
    op.create_check_constraint(
        "ck_description_length",
        "competitions",
        "description IS NULL OR (LENGTH(description) >= 0 AND LENGTH(description) <= 8000)",
    )
