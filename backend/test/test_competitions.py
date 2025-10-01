from datetime import datetime, timedelta, timezone
import json

import pytest
from sqlalchemy import select

from app.models.competition import Competition


@pytest.mark.asyncio
async def test_create_and_query_competition(db_session):
    # Create
    comp = Competition(
        title="Junior Science Fair",
        description="A friendly fair for junior students.",
        competition_link="https://example.org/competitions/junior-science-fair",
        registration_deadline=datetime.now(timezone.utc) + timedelta(days=30),
        background_image_url="https://example.org/images/bg.png",
        location="Hanoi",
        format="ONLINE",
        scale="REGIONAL",
    )
    comp.detail_image_urls_list = [
        "https://example.org/images/detail1.png",
        "https://example.org/images/detail2.png",
    ]
    db_session.add(comp)
    await db_session.flush()
    await db_session.commit()

    # Query by title
    result = await db_session.execute(
        select(Competition).where(Competition.title == "Junior Science Fair")
    )
    row = result.scalar_one()

    assert row.id is not None
    assert row.title == "Junior Science Fair"
    assert row.is_active is True
    assert row.is_featured is False
    assert (
        row.competition_link == "https://example.org/competitions/junior-science-fair"
    )
    assert row.background_image_url == "https://example.org/images/bg.png"
    assert row.location == "Hanoi"
    assert row.format == "ONLINE"
    assert row.scale == "REGIONAL"
    assert row.detail_image_urls_list == [
        "https://example.org/images/detail1.png",
        "https://example.org/images/detail2.png",
    ]
    assert row.detail_image_urls == json.dumps(
        [
            "https://example.org/images/detail1.png",
            "https://example.org/images/detail2.png",
        ]
    )
    assert row.created_at.tzinfo is not None
    assert row.updated_at.tzinfo is not None
    assert row.registration_deadline.tzinfo is not None
