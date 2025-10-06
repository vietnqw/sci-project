"""merge heads after description TEXT migration

Revision ID: 6c2c417abde1
Revises: 14be21fab71f, 7abc1234def0
Create Date: 2025-10-06 23:08:04.167583

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "6c2c417abde1"
down_revision: Union[str, Sequence[str], None] = ("14be21fab71f", "7abc1234def0")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
