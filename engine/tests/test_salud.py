"""Test del criterio principal del esqueleto del engine: la comprobación
de salud responde y refleja el estado real de la base de datos."""

import importlib
import os

from fastapi.testclient import TestClient


def _cliente() -> TestClient:
    from app import db, main

    db.obtener_engine.cache_clear()
    importlib.reload(main)
    return TestClient(main.app)


def test_salud_ok_con_base_de_datos():
    assert os.environ.get("DATABASE_URL"), "el test necesita DATABASE_URL"
    respuesta = _cliente().get("/salud")
    assert respuesta.status_code == 200
    assert respuesta.json() == {"estado": "ok", "base_de_datos": "conectada"}


def test_salud_error_sin_base_de_datos(monkeypatch):
    monkeypatch.setenv(
        "DATABASE_URL", "postgresql://postgres@localhost:59999/no-existe"
    )
    respuesta = _cliente().get("/salud")
    assert respuesta.status_code == 503
    assert respuesta.json()["estado"] == "error"
