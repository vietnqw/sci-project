"""
Manage PostgreSQL database: create or drop the target database.

Reads connection details from `app.config.settings.settings` (which in turn
loads environment variables from the top-level .env file one directory above
`backend/`).

Usage:
  uv run python scripts/manage_database.py create --db [DBNAME]
  uv run python scripts/manage_database.py drop --db [DBNAME]
  uv run python scripts/manage_database.py create --admin-user
  uv run python scripts/manage_database.py drop --admin-user

Environment:
  POSTGRES_ADMIN_DB: admin database name (default: "postgres")
  POSTGRES_SSLMODE: psycopg2 sslmode (default: "prefer")
"""

import argparse
import os
import sys

import psycopg2
from psycopg2 import sql
from sqlalchemy import select
from sqlalchemy.orm import Session as SyncSession

from app.config.database import SessionLocalSync
from app.core.security import hash_password
from app.models.user import User, UserRole

from app.config.settings import settings


def get_admin_database_name() -> str:
    return os.getenv("POSTGRES_ADMIN_DB", "postgres")


def open_admin_connection(autocommit: bool = False):
    admin_db = get_admin_database_name()
    sslmode = os.getenv("POSTGRES_SSLMODE", "prefer")
    conn = psycopg2.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        dbname=admin_db,
        sslmode=sslmode,
    )
    if autocommit:
        conn.autocommit = True
    return conn


def database_exists(connection, database_name: str) -> bool:
    query = "SELECT 1 FROM pg_database WHERE datname = %s;"
    with connection.cursor() as cursor:
        cursor.execute(query, (database_name,))
        return cursor.fetchone() is not None


def create_database(connection, database_name: str) -> None:
    stmt = sql.SQL("CREATE DATABASE {};").format(sql.Identifier(database_name))
    with connection.cursor() as cursor:
        cursor.execute(stmt)


def terminate_connections(connection, database_name: str) -> None:
    """Terminate connections to the target database to allow DROP DATABASE."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = %s AND pid <> pg_backend_pid();
            """,
            (database_name,),
        )


def drop_database(connection, database_name: str) -> None:
    terminate_connections(connection, database_name)
    stmt = sql.SQL("DROP DATABASE {};").format(sql.Identifier(database_name))
    with connection.cursor() as cursor:
        cursor.execute(stmt)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Manage PostgreSQL database")
    subparsers = parser.add_subparsers(dest="command", required=True)

    create_parser = subparsers.add_parser(
        "create", help="Create database or admin user"
    )
    create_group = create_parser.add_mutually_exclusive_group(required=True)
    create_group.add_argument(
        "--db",
        dest="db_name",
        nargs="?",
        const=None,
        help="Create database (optionally specify name)",
    )
    create_group.add_argument(
        "--admin-user",
        action="store_true",
        help="Create admin user from environment variables",
    )

    drop_parser = subparsers.add_parser("drop", help="Drop database or admin user")
    drop_group = drop_parser.add_mutually_exclusive_group(required=True)
    drop_group.add_argument(
        "--db",
        dest="db_name",
        nargs="?",
        const=None,
        help="Drop database (optionally specify name)",
    )
    drop_group.add_argument(
        "--admin-user",
        action="store_true",
        help="Remove admin user from environment variables",
    )

    return parser.parse_args()


def _admin_env_ok() -> tuple[bool, str]:
    if not all(
        [
            settings.ADMIN_EMAIL,
            settings.ADMIN_PASSWORD,
            settings.ADMIN_FULL_NAME,
            settings.ADMIN_PHONE_NUMBER,
            settings.ADMIN_ORGANIZATION,
        ]
    ):
        return (
            False,
            "Missing ADMIN_* environment variables. Please set ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FULL_NAME, ADMIN_PHONE_NUMBER, ADMIN_ORGANIZATION.",
        )
    return True, ""


def create_admin_user(session: SyncSession) -> int:
    ok, msg = _admin_env_ok()
    if not ok:
        print(msg)
        return 2

    admin_email = str(settings.ADMIN_EMAIL)
    existing = session.execute(
        select(User).where(User.email == admin_email)
    ).scalar_one_or_none()
    if existing:
        print(f"Admin user '{admin_email}' already exists. Nothing to do.")
        return 0

    user = User(
        email=admin_email,
        full_name=str(settings.ADMIN_FULL_NAME),
        phone_number=str(settings.ADMIN_PHONE_NUMBER),
        organization=str(settings.ADMIN_ORGANIZATION),
        hashed_password=hash_password(str(settings.ADMIN_PASSWORD)),
        role=UserRole.ADMIN,
        is_active=True,
    )
    session.add(user)
    session.commit()
    print(f"Admin user '{admin_email}' created.")
    return 0


def remove_admin_user(session: SyncSession) -> int:
    ok, msg = _admin_env_ok()
    if not ok:
        print(msg)
        return 2

    admin_email = str(settings.ADMIN_EMAIL)
    existing = session.execute(
        select(User).where(User.email == admin_email)
    ).scalar_one_or_none()
    if not existing:
        print(f"Admin user '{admin_email}' does not exist. Nothing to do.")
        return 0

    session.delete(existing)
    session.commit()
    print(f"Admin user '{admin_email}' removed.")
    return 0


def main() -> int:
    args = parse_args()

    # Admin user operations do not require admin DB connection
    if hasattr(args, "admin_user") and args.admin_user:
        db_url = settings.POSTGRES_URL_SYNC
        print(f"Connecting to application database for admin ops: {db_url}")
        try:
            with SessionLocalSync() as session:  # type: ignore[attr-defined]
                if args.command == "create":
                    return create_admin_user(session)
                else:
                    return remove_admin_user(session)
        except Exception as exc:  # noqa: BLE001
            print(f"Admin operation failed: {exc}")
            return 2

    # Database create/drop operations below
    target_db = getattr(args, "db_name", None) or settings.POSTGRES_DB

    print(
        f"Connecting to admin database '{get_admin_database_name()}' on host "
        f"{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT} as user '{settings.POSTGRES_USER}'"
    )

    try:
        conn = open_admin_connection(autocommit=True)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to connect to admin database: {exc}")
        return 1

    try:
        if args.command == "create":
            if database_exists(conn, target_db):
                print(f"Database '{target_db}' already exists. Nothing to do.")
                return 0
            print(f"Creating database '{target_db}' ...")
            create_database(conn, target_db)
            print(f"Database '{target_db}' created successfully.")
            return 0

        if args.command == "drop":
            if not database_exists(conn, target_db):
                print(f"Database '{target_db}' does not exist. Nothing to do.")
                return 0
            print(f"Dropping database '{target_db}' ...")
            drop_database(conn, target_db)
            print(f"Database '{target_db}' dropped successfully.")
            return 0

        print("Unknown command")
        return 2
    except Exception as exc:  # noqa: BLE001
        print(f"Error while managing database '{target_db}': {exc}")
        return 2
    finally:
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())
