"""
Manage PostgreSQL database: create or drop the target database.

Reads connection details from `app.config.settings.settings` (which in turn
loads environment variables from the top-level .env file one directory above
`backend/`).

Usage:
  uv run python scripts/manage_database.py create [--db DBNAME]
  uv run python scripts/manage_database.py drop [--db DBNAME]

Environment:
  POSTGRES_ADMIN_DB: admin database name (default: "postgres")
  POSTGRES_SSLMODE: psycopg2 sslmode (default: "prefer")
"""

import argparse
import os
import sys

import psycopg2
from psycopg2 import sql

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

    create_parser = subparsers.add_parser("create", help="Create database if missing")
    create_parser.add_argument("--db", dest="db_name", default=None)

    drop_parser = subparsers.add_parser("drop", help="Drop database if exists")
    drop_parser.add_argument("--db", dest="db_name", default=None)

    return parser.parse_args()


def main() -> int:
    args = parse_args()
    target_db = args.db_name or settings.POSTGRES_DB

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
