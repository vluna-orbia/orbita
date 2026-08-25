"""Modelos SQLAlchemy de las tablas que este servicio escribe.

El contrato del brief maestro: el engine escribe research_intents,
findings y digest_runs; la app Next.js solo las lee. Prisma es el dueño
del esquema, así que estas clases describen tablas ya existentes
(create_type=False en los enums) y nunca las crean ni las migran.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, ENUM, JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

# Enums creados por la migración de Prisma.
accion_sugerida = ENUM(
    "crear_tarea",
    "revisar_decision",
    "solo_leer",
    "descartar",
    name="AccionSugerida",
    create_type=False,
)
finding_estado = ENUM(
    "nuevo",
    "leido",
    "guardado",
    "descartado",
    "convertido",
    name="FindingEstado",
    create_type=False,
)


class Base(DeclarativeBase):
    pass


class ResearchIntent(Base):
    __tablename__ = "research_intents"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String)
    project_id: Mapped[str] = mapped_column(String)
    pregunta: Mapped[str] = mapped_column(Text)
    keywords: Mapped[list[str]] = mapped_column(ARRAY(Text))
    justificacion: Mapped[str] = mapped_column(Text)
    peso: Mapped[float] = mapped_column(Float, default=1.0)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    derivado_de_brief_version: Mapped[int | None] = mapped_column(Integer, nullable=True)
    editado_manual: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class Finding(Base):
    __tablename__ = "findings"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String)
    project_id: Mapped[str] = mapped_column(String)
    intent_id: Mapped[str | None] = mapped_column(String, nullable=True)
    source_id: Mapped[str | None] = mapped_column(String, nullable=True)
    titulo: Mapped[str] = mapped_column(String)
    url: Mapped[str] = mapped_column(String)
    publicado_el: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resumen_es: Mapped[str] = mapped_column(Text)
    por_que_importa: Mapped[str] = mapped_column(Text)
    accion_sugerida: Mapped[str] = mapped_column(accion_sugerida)
    titulo_tarea_propuesto: Mapped[str | None] = mapped_column(String, nullable=True)
    score_relevancia: Mapped[float] = mapped_column(Float)
    score_novedad: Mapped[float] = mapped_column(Float)
    score_accionabilidad: Mapped[float] = mapped_column(Float)
    estado: Mapped[str] = mapped_column(finding_estado, default="nuevo")
    motivo_descarte: Mapped[str | None] = mapped_column(String, nullable=True)
    task_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)


class DigestRun(Base):
    __tablename__ = "digest_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    user_id: Mapped[str] = mapped_column(String)
    fecha: Mapped[datetime] = mapped_column(DateTime)
    estado: Mapped[str] = mapped_column(String)
    duracion_s: Mapped[float | None] = mapped_column(Float, nullable=True)
    findings_count: Mapped[int] = mapped_column(Integer, default=0)
    coste_desglose: Mapped[dict] = mapped_column(JSONB)
    warnings: Mapped[list] = mapped_column(JSONB)
    traza: Mapped[dict] = mapped_column(JSONB)
    created_at: Mapped[datetime] = mapped_column(DateTime)
    updated_at: Mapped[datetime] = mapped_column(DateTime)
