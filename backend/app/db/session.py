from __future__ import annotations

from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.db.base import Base
from app.db.migrations import run_migrations


settings = get_settings()

database_url = settings.database_url
if database_url.startswith("sqlite:///./"):
    db_relative_path = database_url.removeprefix("sqlite:///./")
    db_absolute_path = Path(__file__).resolve().parents[2] / db_relative_path
    db_absolute_path.parent.mkdir(parents=True, exist_ok=True)
    database_url = f"sqlite:///{db_absolute_path.as_posix()}"

connect_args = {"check_same_thread": False} if database_url.startswith("sqlite") else {}
engine_kwargs = {
    "future": True,
    "connect_args": connect_args,
    "pool_pre_ping": True,
}
if not database_url.startswith("sqlite"):
    engine_kwargs.update(
        {
            "pool_size": settings.db_pool_size,
            "max_overflow": settings.db_max_overflow,
            "pool_recycle": settings.db_pool_recycle_seconds,
        }
    )

engine = create_engine(database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def _ensure_mysql_database_exists() -> None:
    if not database_url.startswith("mysql"):
        return

    parsed = urlsplit(database_url)
    database_name = parsed.path.lstrip("/")
    if not database_name:
        return

    server_url = urlunsplit((parsed.scheme, parsed.netloc, "", parsed.query, parsed.fragment))
    bootstrap_engine = create_engine(server_url, future=True, pool_pre_ping=True)
    with bootstrap_engine.connect() as connection:
        connection.execution_options(isolation_level="AUTOCOMMIT").execute(
            text(f"CREATE DATABASE IF NOT EXISTS `{database_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        )
    bootstrap_engine.dispose()


def init_db() -> None:
    import app.models  # noqa: F401

    _ensure_mysql_database_exists()
    Base.metadata.create_all(bind=engine)
    run_migrations(engine)
