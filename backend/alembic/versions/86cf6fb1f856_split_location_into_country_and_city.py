"""split_location_into_country_and_city

Revision ID: 86cf6fb1f856
Revises: 6ab3b6975ec1
Create Date: 2025-10-04 23:43:32.190216

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "86cf6fb1f856"
down_revision: Union[str, Sequence[str], None] = "6ab3b6975ec1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add new columns
    op.add_column(
        "competitions",
        sa.Column("location_country", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "competitions", sa.Column("location_city", sa.String(length=255), nullable=True)
    )

    # Migrate data from location to new columns
    # Split existing location data (format: "Country, City")
    connection = op.get_bind()
    result = connection.execute(
        sa.text("SELECT id, location FROM competitions WHERE location IS NOT NULL")
    )

    for row in result:
        comp_id, location = row
        if location and "," in location:
            parts = location.split(",", 1)
            country = parts[0].strip()
            city = parts[1].strip()

            connection.execute(
                sa.text(
                    "UPDATE competitions SET location_country = :country, location_city = :city WHERE id = :id"
                ),
                {"country": country, "city": city, "id": comp_id},
            )
        else:
            # If no comma, treat as country only
            connection.execute(
                sa.text(
                    "UPDATE competitions SET location_country = :location, location_city = :location WHERE id = :id"
                ),
                {"location": location, "id": comp_id},
            )

    # Make columns non-nullable
    op.alter_column("competitions", "location_country", nullable=False)
    op.alter_column("competitions", "location_city", nullable=False)

    # Drop the old location column
    op.drop_column("competitions", "location")


def downgrade() -> None:
    """Downgrade schema."""
    # Add back the location column
    op.add_column(
        "competitions", sa.Column("location", sa.String(length=255), nullable=True)
    )

    # Migrate data back to location column
    connection = op.get_bind()
    result = connection.execute(
        sa.text("SELECT id, location_country, location_city FROM competitions")
    )

    for row in result:
        comp_id, country, city = row
        if country and city:
            location = f"{country}, {city}"
        elif country:
            location = country
        else:
            location = ""

        connection.execute(
            sa.text("UPDATE competitions SET location = :location WHERE id = :id"),
            {"location": location, "id": comp_id},
        )

    # Make location non-nullable
    op.alter_column("competitions", "location", nullable=False)

    # Drop the new columns
    op.drop_column("competitions", "location_city")
    op.drop_column("competitions", "location_country")
