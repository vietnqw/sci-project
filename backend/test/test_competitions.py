from datetime import datetime, timedelta, timezone

import pytest

from app.models.user import UserRole


@pytest.mark.anyio
async def test_competitions_api_flow(client, create_user, auth_header_factory):
    # Create two users: owner and admin
    owner = await create_user("owner@example.com", "OwnerPass1!")
    admin = await create_user("admin@example.com", "AdminPass1!", role=UserRole.ADMIN)

    owner_auth = auth_header_factory(owner)
    admin_auth = auth_header_factory(admin)

    # Public list should work (empty initially)
    resp = await client.get("/competitions")
    assert resp.status_code == 200
    assert resp.json()["total"] == 0

    # Owner creates a competition
    payload = {
        "title": "Junior Science Fair",
        "description": "A friendly fair for junior students.",
        "competition_link": "https://example.org/competitions/junior-science-fair",
        "registration_deadline": (
            datetime.now(timezone.utc) + timedelta(days=30)
        ).isoformat(),
        "background_image_url": "https://example.org/images/bg.png",
        "detail_image_urls": [
            "https://example.org/images/detail1.png",
            "https://example.org/images/detail2.png",
        ],
        "location": "Hanoi",
        "format": "ONLINE",
        "scale": "REGIONAL",
    }
    resp = await client.post("/competitions", json=payload, headers=owner_auth)
    assert resp.status_code == 201, resp.text
    comp = resp.json()
    comp_id = comp["id"]

    # Public list (no owner filter) should include the competition
    resp = await client.get("/competitions")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["competitions"][0]["title"] == "Junior Science Fair"

    # Pagination sanity check
    resp = await client.get("/competitions?skip=0&limit=1")
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1
    assert len(resp.json()["competitions"]) <= 1

    # Public cannot filter by another owner's owner_id; must not error if owner_id omitted
    resp = await client.get(f"/competitions?owner_id={owner.id}")
    # Non-admin with owner_id filter should be 403 (AuthorizationError)
    assert resp.status_code == 403

    # Owner can list their own via /competitions/{user_id}
    resp = await client.get(f"/competitions/{owner.id}", headers=owner_auth)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1

    # Admin can list competitions for any user
    resp = await client.get(f"/competitions/{owner.id}", headers=admin_auth)
    assert resp.status_code == 200
    assert resp.json()["total"] == 1

    # Detail endpoint is public
    resp = await client.get(f"/competitions/detail/{comp_id}")
    assert resp.status_code == 200
    assert resp.json()["id"] == comp_id

    # Owner updates their competition (allowed)
    update_payload = {"description": "Updated description", "format": "OFFLINE"}
    resp = await client.put(
        f"/competitions/{comp_id}", json=update_payload, headers=owner_auth
    )
    assert resp.status_code == 200
    assert resp.json()["description"] == "Updated description"
    assert resp.json()["format"] == "OFFLINE"

    # Another non-admin user cannot update (create another user)
    other = await create_user("other@example.com", "OtherPass1!")
    other_auth = auth_header_factory(other)
    resp = await client.put(
        f"/competitions/{comp_id}", json=update_payload, headers=other_auth
    )
    assert resp.status_code == 403

    # Owner can toggle is_active
    resp = await client.put(
        f"/competitions/{comp_id}/status/active",
        json={"is_active": False},
        headers=owner_auth,
    )
    assert resp.status_code == 204

    # Admin can toggle is_featured; owner cannot
    resp = await client.put(
        f"/competitions/{comp_id}/status/featured",
        json={"is_featured": True},
        headers=owner_auth,
    )
    assert resp.status_code in (403, 401)
    resp = await client.put(
        f"/competitions/{comp_id}/status/featured",
        json={"is_featured": True},
        headers=admin_auth,
    )
    assert resp.status_code == 204

    # Non-owner cannot delete; owner can; admin can as well
    resp = await client.delete(f"/competitions/{comp_id}", headers=other_auth)
    assert resp.status_code == 403

    # Owner deletes
    resp = await client.delete(f"/competitions/{comp_id}", headers=owner_auth)
    assert resp.status_code == 204

    # Ensure gone
    resp = await client.get(f"/competitions/detail/{comp_id}")
    assert resp.status_code == 404


@pytest.mark.anyio
async def test_validation_and_errors(client, create_user, auth_header_factory):
    user = await create_user("valid@example.com", "StrongPass1!")
    auth = auth_header_factory(user)

    # Invalid timezone-naive deadline should 422
    payload = {
        "title": "Bad Time",
        "registration_deadline": datetime.now(timezone.utc)
        .replace(tzinfo=None)
        .isoformat(),
    }
    resp = await client.post("/competitions", json=payload, headers=auth)
    assert resp.status_code == 422

    # Unknown extra field should 422
    payload = {
        "title": "Extra Field",
        "unknown": "oops",
    }
    resp = await client.post("/competitions", json=payload, headers=auth)
    assert resp.status_code == 422

    # Non-admin filtering by owner_id should 403
    resp = await client.get(f"/competitions?owner_id={user.id}", headers=auth)
    assert resp.status_code == 403
