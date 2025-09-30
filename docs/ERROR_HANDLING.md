## Unified Error Handling

This backend uses a consistent error format and a curated set of error codes.

### Error JSON format

All application errors return:
```json
{
  "error": {
    "type": "invalidtokenerror",
    "code": "AUTH_002",
    "message": "Invalid token",
    "details": "Optional additional context"
  }
}
```

- `type`: lowercased exception class name
- `code`: stable, unique error code
- `message`: human-readable summary
- `details`: optional context where helpful

### HTTP status mapping

- 400 Bad Request: client input errors that are not validation layer errors
- 401 Unauthorized: authentication required/invalid/expired
- 403 Forbidden: authenticated but not allowed (role/ownership)
- 404 Not Found: resource does not exist
- 409 Conflict: unique/duplicate conflicts
- 429 Too Many Requests: rate limiting
- 500 Internal Server Error: unexpected server errors

### Error codes

- AUTH
  - `AUTH_001` Not authenticated
  - `AUTH_002` Invalid token
  - `AUTH_003` Not authorized
  - `AUTH_004` User is inactive

- USER
  - `USER_001` User not found
  - `USER_002` User already exists

- COMMON
  - `COMMON_400` Bad request
  - `COMMON_404` Resource not found
  - `COMMON_409` Conflict

- DB
  - `DB_001` Database error

- RATE
  - `RATE_001` Rate limit exceeded

### Where errors are raised

- `app/api/deps.py`
  - `NotAuthenticatedError` (AUTH_001) when Authorization header missing
  - `InvalidTokenError` (AUTH_002) when JWT invalid/subject invalid/user missing
  - `InactiveUserError` (AUTH_004) for inactive accounts
  - `AuthorizationError` (AUTH_003) for admin-only/ownership checks
  - `BadRequestError` (COMMON_400) when registering while already authenticated

- `app/api/routes/auth.py`
  - `BadRequestError` (COMMON_400) for incorrect credentials
  - `InactiveUserError` (AUTH_004) for inactive accounts

- `app/api/routes/users.py`
  - `DuplicateUserError` (USER_002) when email already registered
  - `UserNotFoundError` (USER_001) when user id not found
  - `AuthorizationError` (AUTH_003) when non-owner/non-admin updates
  - `BadRequestError` (COMMON_400) for wrong current password

### Validation errors (422)

Validation at the Pydantic/FastAPI layer returns the standard 422 error format produced by FastAPI. These are distinct from the custom 400 errors above.

### Extension guidelines

- Prefer specific errors (e.g., DuplicateUserError) over COMMON_* when possible
- Reuse existing codes; add new codes in `app/core/errors.py` with a clear prefix
- Keep messages user-friendly; use `details` for developer/diagnostic context


