# ENTREGA — Encargo 2 · Esqueleto, modelo de datos y despliegue

Escrito para el agente del encargo 3, que no ha visto este hilo.

## Qué construí

Monorepo en la raíz del repositorio, con Postgres compartido del que
Prisma es el dueño único del esquema.

### /web — Next.js 15 App Router, TypeScript, Tailwind 4, shadcn/ui, Prisma 6

- `web/prisma/schema.prisma` — el esquema completo: las dieciséis
  entidades del encargo más las dos de las adendas. Todas llevan
  `user_id` (fijo: `vluna`), `created_at` y `updated_at`. Tablas en
  snake_case plural (`projects`, `research_intents`, `findings`,
  `digest_runs`...) porque el engine las lee con esos nombres.
  - `Decision` (adenda 04): project_id, titulo, opciones JSON,
    bloqueado_por, estado (abierta|cerrada|caducada), opcion_elegida,
    motivo, abierta_desde, cerrada_el, dias_abierta.
  - `Milestone` (adenda 05): project_id, titulo, entregable,
    estimacion_h, orden, completado_el.
  - `Project.tipo` (entrega|continuo, por defecto entrega) y
    `Project.horas_objetivo` (adenda 05).
- `web/prisma/migrations/20260825092827_inicial/` — la migración inicial
  versionada. Ninguna modificación de esquema fuera de migración.
- `web/prisma/seed.ts` — seed destructivo con: los cinco proyectos
  (Yajoma, Cribo, Orbia, Órbita, Flujo de specs) con sus acentos y
  briefs literales de los documentos 04 y 05 (versión 1, hash de
  contenido normalizado, seis secciones parseadas en JSON); el playbook
  versión 1 con R1–R6 (R6 con el texto literal de la adenda 04 y
  `parametros.dias_umbral = 21`); las diecisiete decisiones abiertas
  (10 Yajoma, 7 Cribo) con opciones y quién bloquea; y los tres hitos de
  Flujo de specs (20+30+30 = 80 h).
- `web/src/lib/reglas-proyecto.ts` — las cinco ramas de comportamiento
  por tipo de proyecto de la tabla de la adenda 05, como funciones puras:
  `cuentaParaLimiteDeActivos`, `compromisoSemanal` (con
  `pideResultadoComprometidoSemanal`), `tareasCuentanParaWip`,
  `metricaDeRetrospectiva`, `cierreDelAnillo` (null = anillo abierto).
  **Encargos 3 a 5: consumid este módulo, no reescribáis los
  condicionales.**
- `web/src/lib/brief.ts` — normalización del markdown, hash sha256 y
  parseo de las seis secciones fijas (tolera nivel de encabezado
  distinto y secciones ausentes). Lo usan el seed y los tests; el
  encargo 3 debe reutilizarlo para el versionado.
- `web/src/lib/auth.ts`, `web/src/middleware.ts`,
  `web/src/app/entrar/page.tsx` — autenticación de usuario único:
  contraseña comparada en el servidor (digest en tiempo constante),
  cookie HMAC firmada de 30 días, middleware que protege todo salvo
  /entrar y /api/salud. Sin pantalla de registro.
- `web/src/app/(app)/` — layout con lateral de 216px (Hoy, Proyectos,
  Tareas, Radar, Rituales, Playbook), hueco reservado de sesión abajo,
  barra inferior móvil de cuatro destinos (Hoy, Proyectos, Radar,
  Capturar), y las seis rutas con estado vacío según el sistema de
  diseño: papel #FCF9F4 con grano feTurbulence fijado al viewport, un
  solo Instrument Serif por pantalla (el titular), Outfit para interfaz,
  IBM Plex Mono reservado para datos (.t-dato), coral solo en la acción
  primaria de /entrar. Tokens en `web/src/app/globals.css` (@theme).
- `web/src/components/ui/` — button e input según el patrón shadcn/ui
  (cva + tailwind-merge + radix slot) con los tokens de Órbita;
  `components.json` preparado para añadir componentes con la CLI.
- `web/src/app/api/salud/route.ts` — healthcheck con comprobación real
  de base de datos.
- Tests: `web/src/lib/brief.test.ts`, `web/src/lib/reglas-proyecto.test.ts`
  y `web/tests/seed.test.ts` (integración contra la base con seed:
  recuentos exactos, hash coherente, R6 literal, 10+7 decisiones, hitos
  que suman 80 h, user_id fijo). `npm test`: 24/24.
- Scripts de verificación: `web/scripts/comprobar-rutas.mjs` (16
  comprobaciones de redirección, cookie firmada, healthcheck, contenido
  y navegación) y `web/scripts/verificar-visual.mjs` (Playwright: login
  real por formulario, contraseña incorrecta, seis rutas a 375x812 y
  1440x900, desbordamiento horizontal y consola sin errores).

### /engine — FastAPI + Python 3.12 (uv), esqueleto

- `engine/app/main.py` — FastAPI con `/salud` (comprueba la conexión a
  la base). Los tres endpoints del contrato llegan con el encargo 6.
- `engine/app/db.py` — SQLAlchemy sobre la misma DATABASE_URL (adapta el
  esquema de URL de Prisma a psycopg3). Sin migraciones propias.
- `engine/app/modelos.py` — modelos de las tablas que el engine
  escribirá (`research_intents`, `findings`, `digest_runs`), con los
  enums de Prisma referenciados con `create_type=False`.
- `engine/tests/test_salud.py` — pytest 2/2 (salud con base y sin base).
- `langgraph` declarado en `pyproject.toml` y anclado en `uv.lock`; no
  se importa todavía.

### Despliegue

- `web/railway.json` — build Nixpacks, arranque con
  `npx prisma migrate deploy && npm run start`, healthcheck `/api/salud`.
- `engine/railway.json` — uvicorn, healthcheck `/salud`.
- `web/.env.example` y `engine/.env.example` — documentados variable a
  variable (DATABASE_URL, ORBITA_PASSWORD, AUTH_SECRET, TZ, PORT).
- **Estado: desplegado y verificado.** Proyecto Railway
  `practical-sparkle` (token de proyecto, credencial RAILWAY_TOKEN en la
  skill "Desplegar Órbita en Railway (token de proyecto)"), con los tres
  servicios: Postgres, web y engine, creados con `railway add`.
  - Web: https://web-production-db5c1.up.railway.app — `/api/salud`
    responde ok con base conectada; sin sesión, todo redirige a /entrar.
  - Engine: sin dominio público a propósito (servicio interno); su
    healthcheck `/salud` lo validó Railway en el despliegue.
  - Migraciones como `preDeployCommand` en cada despliegue. El seed se
    ejecutó una sola vez mediante un pre-deploy temporal
    (`migrate deploy && db:seed`) y quedó registrado en logs:
    proyectos 5, briefs 5, reglas 6, decisiones 17, hitos 3. El
    railway.json del repositorio vuelve a llevar solo `migrate deploy`:
    ningún despliegue futuro relanza el seed (es destructivo).
  - ORBITA_PASSWORD y AUTH_SECRET se generaron aleatorias y viven solo
    en las variables del servicio web en Railway.

## Qué decidí

- **Las cinco ramas como módulo puro.** El encargo prohíbe lógica de
  negocio y la adenda pide las ramas ahora: viven en
  `reglas-proyecto.ts` con tests y sin cablear. Ver DUDAS 1.
- **Prisma 6 y TypeScript 5.** Prisma 7 cambia el flujo de configuración
  (sin `url` en el datasource) y TypeScript 7 (Go) no está soportado por
  Next 15. El brief no fija versión; quedan las líneas estables. Ver
  DUDAS 9.
- **Tablas snake_case plural con campos en el idioma del documento**
  (`content_hash`, `siguiente_paso`...), para que el engine lea
  exactamente lo que el brief maestro nombra.
- **Seed literal y solo lo pedido**: briefs transcritos sin tocar, cinco
  proyectos activos aunque desborde R2 (los documentos lo declaran así),
  fechas de decisiones plausibles al faltar las reales. Ver DUDAS 3, 4
  y 7.
- **Categorías y dureza de las reglas** asignadas a falta de
  especificación: R1/R2 foco duras, R3 ejecución dura, R4 captura, R5
  revisión, R6 ejecución blandas. Ver DUDAS 5 y 6.
- **Autenticación sin dependencia externa**: HMAC con Web Crypto (edge y
  Node), cookie httpOnly de 30 días, comparación en tiempo constante.
- **shadcn/ui a mano**: button e input escritos según el patrón oficial
  (cva + slot) con los tokens de Órbita; la CLI queda configurada en
  `components.json` para los encargos siguientes.
- **Un serif por pantalla**: el titular de cada pantalla en Instrument
  Serif; en Hoy es el saludo. Coherente con la dirección del encargo 1.
- **Railway con token de proyecto** a petición del usuario, para aislar
  sus proyectos en producción. `railway add` sí pudo crear la base y los
  servicios con ese token. Ver DUDAS 14.
- **Node 22 fijado en engines**: Nixpacks elegía Node 18 con npm 9, cuya
  gestión de optionalDependencies dejaba fuera el binding nativo de
  Tailwind (@tailwindcss/oxide) y rompía el build. Con engines 22.x el
  build reproduce el local. El lockfile además se regeneró completo.
- **Seed en producción como pre-deploy temporal**: un despliegue con
  `migrate deploy && db:seed`, revertido justo después. Alternativas
  (railway run local o URL pública de la base) descartadas: el sandbox
  solo permite salida HTTP y la base no se expone.
- **Aviso de Railway**: config as code (railway.json) está deprecado en
  favor de .railway/railway.ts y deja de funcionar el 01/12/2026. Migrar
  antes de esa fecha; no bloquea este encargo.

## Qué quedó fuera

- Toda la lógica de negocio: CRUD de proyectos, versionado funcional del
  brief, máquina de estados de tareas, WIP, sesiones, rituales, radar.
  Encargos 3 a 7.
- Los tres endpoints del contrato del engine y el pipeline LangGraph
  (encargo 6).
- Contenido real en las pantallas: todas muestran su estado vacío. Los
  datos del seed se verán cuando cada encargo construya su vista.
- Seed de tareas, sesiones, planificaciones, intents y hallazgos
  (DUDAS 7).
- Cierre de sesión de usuario (DUDAS 10) y cualquier cosa de la lista
  prohibida (multiusuario, roles, notificaciones, integraciones, modo
  oscuro, administración, analítica).

## Qué falta verificar a mano

- **El login en producción con tu navegador**: la ORBITA_PASSWORD está
  en las variables del servicio web en Railway (panel → web →
  Variables). Entra en https://web-production-db5c1.up.railway.app y
  comprueba que la sesión dura sin volver a pedir contraseña.
- **La consola del navegador real en producción**: verificada limpia en
  Chromium local; conviene un vistazo en tu navegador habitual.
- Las fechas `abierta_desde` de las diecisiete decisiones: plausibles,
  no reales (DUDAS 3). Corregirlas si el aviso de 21 días va a mentir.
- Los textos de los briefs de Orbia y Órbita: el documento 04 los marca
  como escritos por inferencia y pide revisarlos antes de darlos por
  buenos.
- El grano y el foco coral en Safari y en pantallas de alta densidad
  (verificado en Chromium headless a 375x812 y 1440x900).

## Verificación criterio a criterio

| Criterio del encargo | Cumple | Nota |
|---|---|---|
| Monorepo /web + /engine, Postgres compartido, Prisma dueño del esquema | Sí | Engine con SQLAlchemy sin migraciones propias |
| Esquema con las 16 entidades y user_id/created_at/updated_at en todas | Sí | Migración inicial versionada |
| Mod 1: entidad Decision con los campos de la adenda 04 | Sí | Incluida dias_abierta (derivado; DUDAS 2) |
| Mod 2: Project.tipo, horas_objetivo y Milestone con las cinco ramas | Sí | Ramas en reglas-proyecto.ts con 13 tests |
| Mod 3: R6 con texto y validación de la adenda 04 | Sí | Texto literal; umbral 21 días en parametros; métrica documentada |
| Layout: lateral 216px con 6 destinos y hueco de cronómetro | Sí | Verificado con captura |
| Móvil: barra inferior de cuatro destinos | Sí | Hoy, Proyectos, Radar, Capturar (44px o más de objetivo táctil) |
| Todas las rutas existen con estado vacío correcto | Sí | 16/16 en comprobar-rutas.mjs |
| Autenticación de un usuario, contraseña, sesión 30 días, sin registro | Sí | Validada en servidor; login real probado con Playwright |
| Seed: 5 proyectos con briefs literales y playbook base | Sí | 5+5+6+17+3 filas; tests de integración 6/6 |
| Diecisiete decisiones de Yajoma y Cribo como registros Decision | Sí | 10 + 7, con opciones y bloqueado_por |
| Despliegue en Railway: 3 servicios, migraciones al arrancar, health checks, .env.example | Sí | Desplegado en practical-sparkle; healthchecks en verde; seed cargado en producción |
| Test del criterio principal | Sí | 24 tests vitest + 2 pytest + 2 scripts de verificación |
| Sin errores en consola | Sí | Comprobado con Playwright en 14 páginas |
| Correcto a 375px | Sí | Sin desbordamiento horizontal; capturas a 375x812 |
| Español de España, sin exclamaciones ni emojis | Sí | Toda la interfaz y el seed |
| Datos de ejemplo en el seed | Sí | La app nunca se ve vacía en desarrollo (a nivel de datos; las vistas llegan por encargo) |
