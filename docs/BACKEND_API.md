# SCI Backend API — Authentication and Users

- Base URL prefix: `/api/v1`
- Authentication: Bearer JWT in the `Authorization` header
  - Example: `Authorization: Bearer <JWT>`
- Roles: `ADMIN`, `CREATOR`

## Authentication

- POST `/auth/login`
  - Purpose: Obtain a JWT for subsequent authenticated requests
  - Permissions: Public
  - Body (JSON):
    - `email` (string, email)
    - `password` (string)
  - 200 Response (JSON):
    - `access_token` (string)
    - `token_type` (string, default "bearer")
    - `user` (UserResponse)
  - Example:
```bash
curl -X POST \
  http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "jane@example.com",
    "password": "StrongPass123"
  }'
```

- GET `/auth/me`
  - Purpose: Get the currently authenticated user's profile
  - Permissions: Authenticated (any user)
  - Headers: `Authorization: Bearer <JWT>`
  - 200 Response: `UserResponse`
  - Example:
```bash
curl -X GET \
  http://localhost:8000/api/v1/auth/me \
  -H 'Authorization: Bearer <JWT>'
```

## Users

- POST `/users` (Register)
  - Purpose: Create a new user account
  - Permissions: Anonymous only (no Authorization header)
  - Body (JSON):
    - `email` (string, email)
    - `full_name` (string, 1..255)
    - `phone_number` (string, E.164 format, 10..16)
    - `organization` (string, 1..255)
    - `password` (string, min 8, must include upper/lower/digit)
  - 201 Response: `UserResponse`
  - Example:
```bash
curl -X POST \
  http://localhost:8000/api/v1/users \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "jane@example.com",
    "full_name": "Jane Doe",
    "phone_number": "+14155550123",
    "organization": "Example Org",
    "password": "StrongPass123"
  }'
```

- GET `/users` (List)
  - Purpose: List users with filtering and pagination
  - Permissions: Admin only
  - Query params:
    - `skip` (int, default 0, >=0)
    - `limit` (int, default 100, 1..1000)
    - `role` (enum: ADMIN|CREATOR, optional)
    - `is_active` (bool, optional)
    - `search` (string, optional; matches name or email)
  - 200 Response (JSON):
    - `users` (array of `UserResponse`)
    - `total` (int)
  - Example:
```bash
curl -X GET \
  'http://localhost:8000/api/v1/users?skip=0&limit=20&role=CREATOR&search=jane' \
  -H 'Authorization: Bearer <ADMIN_JWT>'
```

- PUT `/users/{user_id}` (Update profile)
  - Purpose: Update profile fields (`email`, `full_name`, `phone_number`, `organization`)
  - Permissions: Admin or the user themselves
  - Body (JSON): any subset of the fields above
  - 200 Response: `UserResponse`
  - Example:
```bash
curl -X PUT \
  http://localhost:8000/api/v1/users/<USER_ID> \
  -H 'Authorization: Bearer <JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "full_name": "Jane A. Doe"
  }'
```

- PUT `/users/{user_id}/password` (Change password)
  - Purpose: Change the user's password
  - Permissions: User themselves (self-only)
  - Body (JSON):
    - `current_password` (string)
    - `new_password` (string, strong)
  - 204 Response (No Content)
  - Example:
```bash
curl -X PUT \
  http://localhost:8000/api/v1/users/<USER_ID>/password \
  -H 'Authorization: Bearer <JWT>' \
  -H 'Content-Type: application/json' \
  -d '{
    "current_password": "StrongPass123",
    "new_password": "StrongerPass456"
  }'
```

- PUT `/users/{user_id}/role` (Update role)
  - Purpose: Change a user's role
  - Permissions: Admin only
  - Body (JSON):
    - `role` (enum: ADMIN|CREATOR)
  - 204 Response (No Content)
  - Example:
```bash
curl -X PUT \
  http://localhost:8000/api/v1/users/<USER_ID>/role \
  -H 'Authorization: Bearer <ADMIN_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{ "role": "ADMIN" }'
```

- PUT `/users/{user_id}/status` (Activate/Deactivate)
  - Purpose: Toggle a user's active status
  - Permissions: Admin only
  - Body (JSON):
    - `is_active` (bool)
  - 204 Response (No Content)
  - Example:
```bash
curl -X PUT \
  http://localhost:8000/api/v1/users/<USER_ID>/status \
  -H 'Authorization: Bearer <ADMIN_JWT>' \
  -H 'Content-Type: application/json' \
  -d '{ "is_active": false }'
```

- DELETE `/users/{user_id}` (Delete)
  - Purpose: Delete a user
  - Permissions: Admin only
  - 204 Response (No Content)
  - Example:
```bash
curl -X DELETE \
  http://localhost:8000/api/v1/users/<USER_ID> \
  -H 'Authorization: Bearer <ADMIN_JWT>'
```

### Schema reference

- UserResponse
```json
{
  "id": "uuid",
  "email": "jane@example.com",
  "full_name": "Jane Doe",
  "phone_number": "+14155550123",
  "organization": "Example Org",
  "role": "CREATOR",
  "is_active": true,
  "created_at": "2025-09-30T12:34:56Z",
  "updated_at": "2025-09-30T12:34:56Z"
}
```

- UserList
```json
{
  "users": [ /* array of UserResponse */ ],
  "total": 123
}
```

### Notes

- JWT
  - Algorithm: HS256
  - Expiration: `ACCESS_TOKEN_EXPIRE_MINUTES` (default 1440 minutes)
- Validation
  - Email must be a valid email address
  - Passwords must be strong (min 8, upper+lower+digit)
  - Phone numbers must be valid E.164 format (10–16 digits)
  - Unknown fields in requests are rejected

## Competitions

- Base path: `/competitions`

- GET `/competitions`
  - Purpose: Listing of competitions with filters and pagination
  - Permissions and visibility:
    - Unauthenticated: only approved (`is_approved = true`)
    - Authenticated non-admin: approved plus competitions owned by the user
    - Admin: can see all; may filter by `owner_id`
  - Query params: from `CompetitionFilterParams`
    - `skip`, `limit`, `location`, `format`, `scale`, `is_active`, `is_featured`, `is_approved`, `is_rejected`, `search`
    - `owner_id` (UUID): admin-only; otherwise `COMPETITION_002`
  - 200 Response (JSON):
    - `competitions` (array of `CompetitionResponse`)
    - `total` (int)
  - Example:
```bash
curl -X GET 'http://localhost:8000/api/v1/competitions?skip=0&limit=10&format=ONLINE&search=junior'
```

- GET `/competitions/{user_id}`
  - Purpose: List competitions for a specific user
  - Permissions: Admin can list any; non-admins only themselves (else `COMPETITION_002`)
  - 200 Response (JSON):
    - `competitions` (array of `CompetitionResponse`)
    - `total` (int)
  - Example:
```bash
curl -X GET 'http://localhost:8000/api/v1/competitions/<USER_ID>' -H 'Authorization: Bearer <JWT>'
```

- GET `/competitions/detail/{competition_id}`
  - Purpose: Get a competition detail
  - Permissions: Public
  - 200 Response (JSON): `CompetitionResponse`
  - 404: `COMPETITION_001` if not found
  - Example:
```bash
curl -X GET 'http://localhost:8000/api/v1/competitions/detail/<COMPETITION_ID>'
```

- POST `/competitions`
  - Purpose: Create a new competition owned by the current user
  - Permissions: Authenticated users
  - Body: `CompetitionCreate`
  - 201 Response (JSON): `CompetitionResponse` (defaults `is_approved=false`, `is_rejected=false`, `rejection_reason=null`)
  - Example:
```bash
curl -X POST 'http://localhost:8000/api/v1/competitions' \
  -H 'Authorization: Bearer <JWT>' -H 'Content-Type: application/json' \
  -d '{
    "title": "Junior Science Fair",
    "description": "A friendly fair.",
    "registration_deadline": "2025-10-30T12:00:00Z",
    "format": "ONLINE",
    "scale": "REGIONAL"
  }'
```

- PUT `/competitions/{competition_id}`
  - Purpose: Update competition information
  - Permissions: Owner or Admin
  - Body: `CompetitionUpdate`
  - 200 Response (JSON): `CompetitionResponse`
  - 403: `COMPETITION_003` if not owner/admin
  - Example:
```bash
curl -X PUT 'http://localhost:8000/api/v1/competitions/<COMPETITION_ID>' \
  -H 'Authorization: Bearer <JWT>' -H 'Content-Type: application/json' \
  -d '{ "description": "Updated" }'
```

- PUT `/competitions/{competition_id}/status/active`
  - Purpose: Toggle `is_active`
  - Permissions: Owner or Admin
  - Body: `{ "is_active": boolean }`
  - 204 Response (No Content)
  - Example:
```bash
curl -X PUT 'http://localhost:8000/api/v1/competitions/<COMPETITION_ID>/status/active' \
  -H 'Authorization: Bearer <JWT>' -H 'Content-Type: application/json' \
  -d '{ "is_active": false }'
```

- PUT `/competitions/{competition_id}/status/featured`
  - Purpose: Toggle `is_featured`
  - Permissions: Admin only
  - Body: `{ "is_featured": boolean }`
  - 204 Response (No Content)
  - Example:
```bash
curl -X PUT 'http://localhost:8000/api/v1/competitions/<COMPETITION_ID>/status/featured' \
  -H 'Authorization: Bearer <ADMIN_JWT>' -H 'Content-Type: application/json' \
  -d '{ "is_featured": true }'
```

- DELETE `/competitions/{competition_id}`
  - Purpose: Delete a competition
  - Permissions: Owner or Admin
  - 204 Response (No Content)
  - Example:
```bash
curl -X DELETE 'http://localhost:8000/api/v1/competitions/<COMPETITION_ID>' \
  -H 'Authorization: Bearer <JWT>'
```

### Admin-only competition management

- GET `/competitions/admin/pending`
  - Purpose: List competitions pending approval (not approved and not rejected)
  - Permissions: Admin only
  - Query params: same as `CompetitionFilterParams`
  - 200 Response (JSON): `CompetitionList`

- PUT `/competitions/admin/{competition_id}/approve`
  - Purpose: Approve a competition
  - Permissions: Admin only
  - 200 Response (JSON): `{ "message": "Competition approved successfully" }`

- PUT `/competitions/admin/{competition_id}/reject`
  - Purpose: Reject a competition and optionally store a reason
  - Permissions: Admin only
  - Body (JSON): `{ "rejection_reason": string | null }`
  - 200 Response (JSON): `{ "message": "Competition rejected successfully" }`

- PUT `/competitions/admin/{competition_id}/feature`
  - Purpose: Mark as featured
  - Permissions: Admin only
  - Body (JSON): `{ "is_featured": true }`
  - 200 Response (JSON): `{ "message": "Competition featured successfully" }`

- PUT `/competitions/admin/{competition_id}/unfeature`
  - Purpose: Remove featured flag
  - Permissions: Admin only
  - 200 Response (JSON): `{ "message": "Competition unfeatured successfully" }`

- PUT `/competitions/admin/{competition_id}/deactivate`
  - Purpose: Deactivate a competition
  - Permissions: Admin only
  - 200 Response (JSON): `{ "message": "Competition deactivated successfully" }`

### Schema reference

- CompetitionResponse
```json
{
  "id": "uuid",
  "title": "Junior Science Fair",
  "description": "A friendly fair.",
  "competition_link": "https://example.org/competitions/junior-science-fair",
  "registration_deadline": "2025-10-30T12:00:00Z",
  "background_image_url": "https://example.org/images/bg.png",
  "detail_image_urls": [
    "https://example.org/images/detail1.png",
    "https://example.org/images/detail2.png"
  ],
  "location": "Hanoi",
  "format": "ONLINE",
  "scale": "REGIONAL",
  "owner_id": "uuid",
  "owner": { "id": "uuid", "full_name": "Jane Doe", "email": "jane@example.com" },
  "is_active": true,
  "is_featured": false,
  "is_approved": false,
  "is_rejected": false,
  "rejection_reason": null,
  "created_at": "2025-10-01T12:00:00Z",
  "updated_at": "2025-10-01T12:00:00Z"
}
```

- CompetitionList
```json
{
  "competitions": [ /* array of CompetitionResponse */ ],
  "total": 1
}
```

### Notes

- Validation
  - `registration_deadline` must be timezone-aware (e.g., `...Z`)
  - `format` is one of: `ONLINE`, `OFFLINE`, `HYBRID`
  - `scale` is one of: `PROVINCIAL`, `REGIONAL`, `INTERNATIONAL`
  - Unknown fields in requests are rejected
- Permissions
  - `owner_id` filter in GET `/competitions` is admin-only
  - Default ordering for listings: newest first (`created_at` DESC)
