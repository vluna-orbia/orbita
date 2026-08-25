"""Motor de investigación de Órbita — esqueleto del encargo 2.

Expone solo la comprobación de salud. El contrato completo (POST /runs,
GET /runs/{id}, POST /intents/derive) y el pipeline LangGraph llegan con
el encargo 6.
"""

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .db import obtener_engine

app = FastAPI(
    title="Órbita — motor de investigación",
    version="0.1.0",
    docs_url=None,
    redoc_url=None,
)


@app.get("/salud")
def salud() -> JSONResponse:
    """Comprobación de salud del servicio, incluida la base de datos."""
    try:
        engine = obtener_engine()
        with engine.connect() as conexion:
            conexion.execute(text("SELECT 1"))
        return JSONResponse({"estado": "ok", "base_de_datos": "conectada"})
    except Exception:
        return JSONResponse(
            status_code=503,
            content={"estado": "error", "base_de_datos": "sin conexión"},
        )
