"""Conexión a la base de datos compartida.

Prisma (servicio web) es el dueño del esquema. Este servicio lee y
escribe sobre las mismas tablas con SQLAlchemy y no ejecuta migraciones
propias.
"""

import os
from functools import lru_cache

from sqlalchemy import Engine, create_engine


def url_de_conexion() -> str:
    """Adapta la DATABASE_URL de Prisma al driver psycopg3."""
    url = os.environ.get("DATABASE_URL", "")
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+psycopg://", 1)
    return url


@lru_cache(maxsize=1)
def obtener_engine() -> Engine:
    url = url_de_conexion()
    if not url:
        raise RuntimeError("Falta DATABASE_URL en el entorno.")
    return create_engine(url, pool_pre_ping=True)
