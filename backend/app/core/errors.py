"""Unified error definitions and formatting for the SCI backend."""

from typing import Any


class APIError(Exception):
    """Base API error with an HTTP status, code, and message."""

    http_status: int = 500
    code: str = "SERVER_001"
    message: str = "Internal server error"
    details: str | None

    def __init__(self, message: str | None = None, *, details: str | None = None):
        if message is not None:
            self.message = message
        self.details = details
        super().__init__(self.message)


def error_payload(error: APIError) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "error": {
            "type": error.__class__.__name__.lower(),
            "code": error.code,
            "message": error.message,
        }
    }
    if error.details:
        payload["error"]["details"] = error.details
    return payload


# 4xx client errors


class BadRequestError(APIError):
    http_status = 400
    code = "COMMON_400"
    message = "Bad request"


class NotAuthenticatedError(APIError):
    http_status = 401
    code = "AUTH_001"
    message = "Not authenticated"


class InvalidTokenError(APIError):
    http_status = 401
    code = "AUTH_002"
    message = "Invalid token"


class AuthorizationError(APIError):
    http_status = 403
    code = "AUTH_003"
    message = "Not authorized"


class InactiveUserError(APIError):
    http_status = 403
    code = "AUTH_004"
    message = "User is inactive"


class ResourceNotFoundError(APIError):
    http_status = 404
    code = "COMMON_404"
    message = "Resource not found"


class UserNotFoundError(ResourceNotFoundError):
    code = "USER_001"
    message = "User not found"


class ConflictError(APIError):
    http_status = 409
    code = "COMMON_409"
    message = "Conflict"


class DuplicateUserError(ConflictError):
    code = "USER_002"
    message = "User already exists"


class RateLimitError(APIError):
    http_status = 429
    code = "RATE_001"
    message = "Rate limit exceeded"


# 5xx server errors


class DatabaseError(APIError):
    http_status = 500
    code = "DB_001"
    message = "Database error"


