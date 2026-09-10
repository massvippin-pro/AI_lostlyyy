"""Tests for configuration settings and database URL assembly."""

import pytest
from sqlalchemy.engine.url import make_url
from sqlalchemy.dialects.postgresql.psycopg import PGDialect_psycopg

from app.core.config import Settings


def test_sqlite_url_preserved():
    """SQLite URLs should pass through untouched."""
    url = "sqlite:///./test.db"
    assert Settings.assemble_db_url(url) == url


def test_postgres_prefix_normalized():
    """postgres:// should be upgraded to postgresql+psycopg://."""
    raw = "postgres://user:secret@localhost:5432/mydb"
    expected = "postgresql+psycopg://user:secret@localhost:5432/mydb"
    assert Settings.assemble_db_url(raw) == expected


def test_postgresql_prefix_normalized():
    """postgresql:// should be upgraded to postgresql+psycopg://."""
    raw = "postgresql://user:secret@localhost:5432/mydb"
    expected = "postgresql+psycopg://user:secret@localhost:5432/mydb"
    assert Settings.assemble_db_url(raw) == expected


def test_surrounding_quotes_stripped():
    """Accidental quotes around the environment variable should be trimmed."""
    raw_double = '"postgresql://user:secret@localhost:5432/mydb"'
    raw_single = "'postgresql://user:secret@localhost:5432/mydb'"
    expected = "postgresql+psycopg://user:secret@localhost:5432/mydb"
    assert Settings.assemble_db_url(raw_double) == expected
    assert Settings.assemble_db_url(raw_single) == expected


def test_password_with_special_characters_encoded():
    """
    Passwords with special characters like '@', '?', '#', ':' must be URL-encoded
    so that SQLAlchemy's make_url and psycopg parse credentials accurately.
    """
    raw = "postgresql://postgres:p@ss?w#rd:123@db.supabase.co:5432/postgres?sslmode=require"
    assembled = Settings.assemble_db_url(raw)

    assert assembled.startswith("postgresql+psycopg://")
    u = make_url(assembled)
    assert u.username == "postgres"
    assert u.password == "p@ss?w#rd:123"
    assert u.host == "db.supabase.co"
    assert u.port == 5432
    assert u.database == "postgres"
    assert u.query == {"sslmode": "require"}


def test_supabase_pooler_format_with_dot_in_username():
    """Supabase connection pooler usernames contain a dot ('postgres.projectref')."""
    raw = "postgresql://postgres.kslmawbhfengkrnxmymg:Secr@tP@ss!@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
    assembled = Settings.assemble_db_url(raw)

    u = make_url(assembled)
    assert u.username == "postgres.kslmawbhfengkrnxmymg"
    assert u.password == "Secr@tP@ss!"
    assert u.host == "aws-0-us-west-1.pooler.supabase.com"
    assert u.port == 6543


def test_previously_crashing_url_parsed_successfully():
    """
    Test that the exact URL pattern that crashed Railway:
    password containing '@?rEw@gz6'
    is safely assembled and dialect-ready without invalid connection options.
    """
    raw = "postgresql://postgres:myPass@?rEw@gz6@db.kslmawbhfengkrnxmymg.supabase.co:5432/postgres?sslmode=require"
    assembled = Settings.assemble_db_url(raw)

    u = make_url(assembled)
    assert u.username == "postgres"
    assert u.password == "myPass@?rEw@gz6"
    assert u.host == "db.kslmawbhfengkrnxmymg.supabase.co"
    assert u.port == 5432
    assert u.database == "postgres"
    assert u.query == {"sslmode": "require"}

    # Verify psycopg dialect args: no invalid keys in cparams!
    dialect = PGDialect_psycopg()
    cargs, cparams = dialect.create_connect_args(u)
    assert "rEw@gz6@db.kslmawbhfengkrnxmymg.supabase.co:5432/postgres?sslmode" not in cparams
    assert cparams["host"] == "db.kslmawbhfengkrnxmymg.supabase.co"
    assert cparams["dbname"] == "postgres"
    assert cparams["user"] == "postgres"
    assert cparams["password"] == "myPass@?rEw@gz6"
    assert cparams["port"] == 5432
    assert cparams["sslmode"] == "require"
