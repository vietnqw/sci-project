## SCI Backend API — Authentication and Users

- Base URL prefix: `/api/v1`
- Authentication: Bearer JWT in the `Authorization` header
  - Example: `Authorization: Bearer <JWT>`
- Roles: `ADMIN`, `CREATOR`

### Authentication

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

### Users

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
