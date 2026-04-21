from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Engine, inspect, text

from app.core.config import get_settings
from app.core.permissions import MODULE_KEYS
from app.core.security import hash_password


settings = get_settings()


def run_migrations(engine: Engine) -> None:
    _ensure_schema_migrations_table(engine)
    with engine.begin() as connection:
        applied_versions = {
            row[0] for row in connection.execute(text("SELECT version FROM schema_migrations"))
        }

    if "20260420_auth_assets" in applied_versions:
        return

    _apply_auth_assets_migration(engine)
    with engine.begin() as connection:
        connection.execute(
            text("INSERT INTO schema_migrations (version, applied_at) VALUES (:version, :applied_at)"),
            {"version": "20260420_auth_assets", "applied_at": datetime.now(timezone.utc)},
        )


def _ensure_schema_migrations_table(engine: Engine) -> None:
    if inspect(engine).has_table("schema_migrations"):
        return
    with engine.begin() as connection:
        connection.execute(
            text(
                """
                CREATE TABLE schema_migrations (
                    version VARCHAR(64) PRIMARY KEY,
                    applied_at DATETIME NOT NULL
                )
                """
            )
        )


def _has_column(engine: Engine, table_name: str, column_name: str) -> bool:
    return any(column["name"] == column_name for column in inspect(engine).get_columns(table_name))


def _add_column_if_missing(engine: Engine, table_name: str, column_name: str, definition: str) -> None:
    if _has_column(engine, table_name, column_name):
        return
    with engine.begin() as connection:
        connection.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {definition}"))


def _create_index_if_missing(engine: Engine, table_name: str, index_name: str, columns: str, *, unique: bool = False) -> None:
    existing = {index["name"] for index in inspect(engine).get_indexes(table_name)}
    if index_name in existing:
        return
    unique_sql = "UNIQUE " if unique else ""
    with engine.begin() as connection:
        connection.execute(text(f"CREATE {unique_sql}INDEX {index_name} ON {table_name} ({columns})"))


def _apply_auth_assets_migration(engine: Engine) -> None:
    dialect = engine.dialect.name

    _add_column_if_missing(engine, "users", "role", "VARCHAR(32) NOT NULL DEFAULT 'user'")
    if not inspect(engine).has_table("user_module_permissions"):
        with engine.begin() as connection:
            bool_type = "BOOLEAN" if dialect == "sqlite" else "TINYINT(1)"
            created_type = "DATETIME" if dialect == "sqlite" else "DATETIME(6)"
            connection.execute(
                text(
                    f"""
                    CREATE TABLE user_module_permissions (
                        id VARCHAR(36) PRIMARY KEY NOT NULL,
                        user_id VARCHAR(36) NOT NULL,
                        module_key VARCHAR(64) NOT NULL,
                        is_enabled {bool_type} NOT NULL DEFAULT 1,
                        created_at {created_type} NOT NULL,
                        updated_at {created_type} NOT NULL,
                        FOREIGN KEY(user_id) REFERENCES users(id)
                    )
                    """
                )
            )
        _create_index_if_missing(engine, "user_module_permissions", "ix_user_module_permissions_user_module", "user_id, module_key", unique=True)
        _create_index_if_missing(engine, "user_module_permissions", "ix_user_module_permissions_user_id", "user_id")

    _add_column_if_missing(engine, "asset_records", "owner_user_id", "VARCHAR(36)")
    _add_column_if_missing(engine, "asset_records", "visibility", "VARCHAR(32) NOT NULL DEFAULT 'private'")
    _add_column_if_missing(engine, "asset_records", "published_at", "DATETIME")
    _add_column_if_missing(engine, "asset_records", "published_by_user_id", "VARCHAR(36)")
    _create_index_if_missing(engine, "asset_records", "ix_asset_records_owner_user_id", "owner_user_id")
    _create_index_if_missing(engine, "asset_records", "ix_asset_records_visibility", "visibility")
    _create_index_if_missing(engine, "asset_records", "ix_asset_records_published_by_user_id", "published_by_user_id")
    _create_index_if_missing(engine, "asset_records", "ix_asset_records_owner_visibility", "owner_user_id, visibility")
    _create_index_if_missing(engine, "users", "ix_users_role", "role")

    with engine.begin() as connection:
        existing_root = connection.execute(
            text("SELECT id, password_hash FROM users WHERE id = :user_id"),
            {"user_id": settings.root_user_id},
        ).mappings().first()
        root_password_hash = hash_password(settings.root_default_password)
        now = datetime.now(timezone.utc)

        if existing_root is None:
            connection.execute(
                text(
                    """
                    INSERT INTO users (id, username, role, display_name, email, password_hash, is_disabled, created_at, updated_at)
                    VALUES (:id, :username, 'root', :display_name, :email, :password_hash, 0, :created_at, :updated_at)
                    """
                ),
                {
                    "id": settings.root_user_id,
                    "username": settings.root_username,
                    "display_name": settings.root_display_name,
                    "email": settings.root_email,
                    "password_hash": root_password_hash,
                    "created_at": now,
                    "updated_at": now,
                },
            )
        else:
            connection.execute(
                text(
                    """
                    UPDATE users
                    SET username = :username, role = 'root', display_name = :display_name, email = :email
                    WHERE id = :id
                    """
                ),
                {
                    "id": settings.root_user_id,
                    "username": settings.root_username,
                    "display_name": settings.root_display_name,
                    "email": settings.root_email,
                },
            )
            if not existing_root["password_hash"]:
                connection.execute(
                    text("UPDATE users SET password_hash = :password_hash WHERE id = :id"),
                    {"id": settings.root_user_id, "password_hash": root_password_hash},
                )

        connection.execute(
            text("UPDATE generation_records SET user_id = :root_user_id WHERE user_id IS NULL"),
            {"root_user_id": settings.root_user_id},
        )
        connection.execute(
            text(
                """
                UPDATE asset_records
                SET owner_user_id = COALESCE(owner_user_id, user_id, :root_user_id)
                WHERE owner_user_id IS NULL
                """
            ),
            {"root_user_id": settings.root_user_id},
        )
        connection.execute(
            text(
                """
                UPDATE asset_records
                SET visibility = CASE
                    WHEN visibility IS NULL OR visibility = '' THEN 'community'
                    ELSE visibility
                END
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE asset_records
                SET published_by_user_id = COALESCE(published_by_user_id, :root_user_id),
                    published_at = COALESCE(published_at, created_at)
                WHERE visibility = 'community'
                """
            ),
            {"root_user_id": settings.root_user_id},
        )

        permission_rows = {
            (row["user_id"], row["module_key"])
            for row in connection.execute(text("SELECT user_id, module_key FROM user_module_permissions")).mappings()
        }
        users = list(connection.execute(text("SELECT id, role FROM users")).mappings())
        for user in users:
            for module_key in MODULE_KEYS:
                if (user["id"], module_key) in permission_rows:
                    continue
                connection.execute(
                    text(
                        """
                        INSERT INTO user_module_permissions (id, user_id, module_key, is_enabled, created_at, updated_at)
                        VALUES (:id, :user_id, :module_key, :is_enabled, :created_at, :updated_at)
                        """
                    ),
                    {
                        "id": f"{user['id'][:20]}-{module_key[:15]}",
                        "user_id": user["id"],
                        "module_key": module_key,
                        "is_enabled": True if user["role"] == "root" else module_key != "asset_management",
                        "created_at": now,
                        "updated_at": now,
                    },
                )
