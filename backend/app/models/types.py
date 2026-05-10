"""Custom SQLAlchemy types for cross-database compatibility."""

from sqlalchemy import JSON, TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB as POSTGRESQL_JSONB
from sqlalchemy.ext.compiler import compiles


class JSONB(TypeDecorator):
    """
    A JSONB type that works with both PostgreSQL (uses JSONB) and SQLite (uses JSON).
    
    PostgreSQL: Uses native JSONB type with efficient indexing and operators
    SQLite: Falls back to JSON type (SQLite doesn't have JSONB)
    """
    
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        """Load dialect-specific implementation."""
        if dialect.name == "postgresql":
            return dialect.type_descriptor(POSTGRESQL_JSONB())
        return dialect.type_descriptor(JSON())


@compiles(JSONB, "postgresql")
def compile_jsonb(type_, compiler, **kw):
    """Compile JSONB for PostgreSQL."""
    return "JSONB"


@compiles(JSONB)
def compile_jsonb_default(type_, compiler, **kw):
    """Compile JSONB as JSON for other databases."""
    return "JSON"
