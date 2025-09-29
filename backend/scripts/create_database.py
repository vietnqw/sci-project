"""
One-off script to create the target PostgreSQL database on an RDS instance.

Reads connection details from `app.config.settings.settings` (which in turn
loads environment variables from the top-level .env file one directory above
`backend/`).

Behavior:
- Connects to the admin database (default: "postgres") using SSL.
- Checks if `settings.POSTGRES_DB` exists.
- Creates the database if it does not exist.

Run once, then delete or keep for future provisioning.
"""

import os
import sys
import argparse

import psycopg2
from psycopg2 import sql

from app.config.settings import settings


def get_admin_database_name() -> str:
    """Return the admin database to connect to for creating databases.

    Defaults to "postgres". Can be overridden via POSTGRES_ADMIN_DB env var.
    """
    return os.getenv("POSTGRES_ADMIN_DB", "postgres")


def open_admin_connection(autocommit: bool = False):
    """Open a psycopg2 connection to the admin database with SSL required.

    When autocommit=True, the connection is prepared for CREATE DATABASE.
    """
    admin_db = get_admin_database_name()
    conn = psycopg2.connect(
        host=settings.POSTGRES_HOST,
        port=settings.POSTGRES_PORT,
        user=settings.POSTGRES_USER,
        password=settings.POSTGRES_PASSWORD,
        dbname=admin_db,
        sslmode="require",
    )
    if autocommit:
        # Ensure CREATE DATABASE can run outside a transaction block
        conn.autocommit = True
    return conn


def database_exists(connection, database_name: str) -> bool:
    """Check if a database exists by name."""
    query = "SELECT 1 FROM pg_database WHERE datname = %s;"
    with connection.cursor() as cursor:
        cursor.execute(query, (database_name,))
        return cursor.fetchone() is not None


def create_database(connection, database_name: str) -> None:
    """Create a new database with a safely quoted identifier.

    Note: CREATE DATABASE cannot run inside a transaction block.
    psycopg2 requires autocommit=True for this operation.
    """
    create_stmt = sql.SQL("CREATE DATABASE {};").format(
        sql.Identifier(database_name)
    )
    with connection.cursor() as cursor:
        cursor.execute(create_stmt)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create PostgreSQL database if missing")
    parser.add_argument(
        "--db",
        dest="db_name",
        default=None,
        help="Override target database name (defaults to settings.POSTGRES_DB)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    target_db = args.db_name or settings.POSTGRES_DB

    print(
        f"Connecting to admin database '{get_admin_database_name()}' on host "
        f"{settings.POSTGRES_HOST}:{settings.POSTGRES_PORT} as user '{settings.POSTGRES_USER}'"
    )

    try:
        conn = open_admin_connection(autocommit=False)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to connect to admin database: {exc}")
        return 1

    try:
        if database_exists(conn, target_db):
            print(f"Database '{target_db}' already exists. Nothing to do.")
            return 0

        # Close non-autocommit connection before CREATE DATABASE
        try:
            conn.close()
        except Exception:
            pass

        print(f"Creating database '{target_db}' ...")
        create_conn = open_admin_connection(autocommit=True)
        try:
            create_database(create_conn, target_db)
        finally:
            try:
                create_conn.close()
            except Exception:
                pass
        print(f"Database '{target_db}' created successfully.")
        return 0
    except Exception as exc:  # noqa: BLE001
        print(f"Error while creating database '{target_db}': {exc}")
        return 2
    finally:
        try:
            conn.close()
        except Exception:
            pass


if __name__ == "__main__":
    sys.exit(main())


