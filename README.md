# Órbita

Sistema operativo personal de trabajo, de un solo usuario. Se construye
por encargos numerados a partir de la especificación (documentos 00 a
05, adjuntos al agente constructor).

## Estructura

- `web/` — Next.js 15 App Router, TypeScript, Tailwind 4, shadcn/ui,
  Prisma 6. Dueño del esquema de PostgreSQL.
- `engine/` — FastAPI + LangGraph (Python 3.12, uv). Lee y escribe las
  mismas tablas con SQLAlchemy, sin migraciones propias.
- `ENTREGA.md` — entrega del último encargo completado. Es la entrada
  del encargo siguiente.
- `DUDAS.md` — ambigüedades y decisiones pendientes de revisión.

## Arranque local

```bash
# Base de datos: PostgreSQL 16 con una base llamada orbita.
cd web && cp .env.example .env   # rellenar valores
npm install && npm run db:migrate && npm run db:seed && npm run dev
cd engine && cp .env.example .env
uv sync && uv run uvicorn app.main:app --port 8000
```

Tests: `npm test` en `web/`, `uv run pytest` en `engine/`.

Despliegue: Railway, tres servicios (web, engine, Postgres); ver
`railway.json` de cada servicio y el `ENTREGA.md` del encargo 2.

El README completo de operación llega con el encargo 8.
