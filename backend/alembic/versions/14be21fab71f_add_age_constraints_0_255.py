"""add_age_constraints_0_255

Revision ID: 14be21fab71f
Revises: 539b54e1b756
Create Date: 2025-10-05 10:41:57.097491

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "14be21fab71f"
down_revision: Union[str, Sequence[str], None] = "539b54e1b756"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add age constraints with 0-255 range
    op.create_check_constraint(
        "ck_min_age_range",
        "competitions",
        "min_age IS NULL OR (min_age >= 0 AND min_age <= 255)",
    )
    op.create_check_constraint(
        "ck_max_age_range",
        "competitions",
        "max_age IS NULL OR (max_age >= 0 AND max_age <= 255)",
    )


def downgrade() -> None:
    """Downgrade schema."""
    # Drop age constraints
    op.drop_constraint("ck_min_age_range", "competitions", type_="check")
    op.drop_constraint("ck_max_age_range", "competitions", type_="check")
