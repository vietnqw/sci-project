import pytest


@pytest.mark.asyncio
async def test_login_success(client, create_user):
    user = await create_user("jane@example.com", "StrongPass123")
    resp = await client.post(
        "/auth/login", json={"email": user.email, "password": "StrongPass123"}
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == user.email


@pytest.mark.asyncio
async def test_login_invalid_credentials(client):
    resp = await client.post(
        "/auth/login", json={"email": "nope@example.com", "password": "bad"}
    )
    assert resp.status_code == 400
    err = resp.json().get("error", {})
    assert err.get("code") == "COMMON_400"


@pytest.mark.asyncio
async def test_me_requires_auth(client):
    resp = await client.get("/auth/me")
    assert resp.status_code == 401
    err = resp.json().get("error", {})
    assert err.get("code") == "AUTH_001"


@pytest.mark.asyncio
async def test_me_success(client, create_user, auth_header_factory):
    user = await create_user("jack@example.com", "StrongPass123")
    headers = auth_header_factory(user)
    resp = await client.get("/auth/me", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == user.email
