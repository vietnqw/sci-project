import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    payload = {
        "email": "new@example.com",
        "full_name": "New User",
        "phone_number": "+14155550123",
        "organization": "Org",
        "password": "StrongPass123",
    }
    resp = await client.post("/users", json=payload, follow_redirects=True)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["email"] == payload["email"]
    assert body["organization"] == payload["organization"]


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    payload = {
        "email": "dup@example.com",
        "full_name": "Dup",
        "phone_number": "+14155550123",
        "organization": "Org",
        "password": "StrongPass123",
    }
    resp1 = await client.post("/users", json=payload, follow_redirects=True)
    assert resp1.status_code == 201
    resp2 = await client.post("/users", json=payload, follow_redirects=True)
    assert resp2.status_code == 409
    assert resp2.json().get("error", {}).get("code") == "USER_002"


@pytest.mark.asyncio
async def test_list_users_requires_admin(client, create_user, auth_header_factory):
    # a normal user
    user = await create_user("u1@example.com", "StrongPass123")
    headers = auth_header_factory(user)
    resp = await client.get("/users", headers=headers)
    assert resp.status_code == 403
    assert resp.json().get("error", {}).get("code") == "AUTH_003"


@pytest.mark.asyncio
async def test_list_users_as_admin(client, create_user, auth_header_factory):
    admin = await create_user(
        "admin@example.com", "StrongPass123", role=user_role("ADMIN")
    )
    headers = auth_header_factory(admin)
    resp = await client.get("/users", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "users" in data and "total" in data


def user_role(name: str):
    from app.models.user import UserRole

    return getattr(UserRole, name)


@pytest.mark.asyncio
async def test_update_self_profile(client, create_user, auth_header_factory):
    user = await create_user("editme@example.com", "StrongPass123")
    headers = auth_header_factory(user)
    resp = await client.put(
        f"/users/{user.id}", json={"full_name": "Edited"}, headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["full_name"] == "Edited"


@pytest.mark.asyncio
async def test_update_profile_admin_or_self_only(
    client, create_user, auth_header_factory
):
    user1 = await create_user("user1@example.com", "StrongPass123")
    user2 = await create_user("user2@example.com", "StrongPass123")
    headers = auth_header_factory(user1)
    resp = await client.put(
        f"/users/{user2.id}", json={"full_name": "Hack"}, headers=headers
    )
    assert resp.status_code == 403
    assert resp.json().get("error", {}).get("code") == "AUTH_003"


@pytest.mark.asyncio
async def test_change_password_self_only(client, create_user, auth_header_factory):
    user = await create_user("pwd@example.com", "StrongPass123")
    headers = auth_header_factory(user)
    # wrong current password
    resp = await client.put(
        f"/users/{user.id}/password",
        json={"current_password": "wrong", "new_password": "Stronger456"},
        headers=headers,
    )
    assert resp.status_code == 400
    assert resp.json().get("error", {}).get("code") == "COMMON_400"

    # correct
    resp2 = await client.put(
        f"/users/{user.id}/password",
        json={"current_password": "StrongPass123", "new_password": "Stronger456"},
        headers=headers,
    )
    assert resp2.status_code == 204


@pytest.mark.asyncio
async def test_admin_update_role_and_status_and_delete(
    client, create_user, auth_header_factory
):
    admin = await create_user(
        "admin2@example.com", "StrongPass123", role=user_role("ADMIN")
    )
    headers = auth_header_factory(admin)
    target = await create_user("t@example.com", "StrongPass123")

    # role
    resp = await client.put(
        f"/users/{target.id}/role", json={"role": "ADMIN"}, headers=headers
    )
    assert resp.status_code == 204

    # status
    resp2 = await client.put(
        f"/users/{target.id}/status", json={"is_active": False}, headers=headers
    )
    assert resp2.status_code == 204

    # delete
    resp3 = await client.delete(f"/users/{target.id}", headers=headers)
    assert resp3.status_code == 204
