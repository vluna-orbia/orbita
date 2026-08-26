# ENTREGA — Encargo 4b · Sincronizar especificación y cerrar dos huecos

Escrito para el agente del encargo siguiente (el 5 del documento 03,
rituales y métricas de adherencia, que sigue entero por hacer). Tres
partes: la especificación alineada con lo construido, el alta y la
edición de decisiones, y los rechazos por límite de WIP persistidos.

## Qué construí

### Parte 1 — Especificación sincronizada (fuera del repositorio)

Los documentos 00 (brief maestro), 02 (historias de usuario) y 05 (adenda
Flujo de specs) reescritos para reflejar las decisiones de DUDAS.md 1 a
41, sin historias nuevas y sin cambios de alcance. Cada documento termina
con un registro de cambios que dice qué párrafo cambió y qué DUDA lo
motiva. Lo gordo: el 00 pasa a seis reglas con la semántica viva del
playbook (parámetros en JSON, desactivar desactiva, validación solo sobre
transiciones nuevas) y el quinto proyecto; el 02 absorbe las decisiones de
los encargos 2 a 4 en H1.1-H1.4, H2.1-H2.6, H3.1-H3.4, H5.1, H5.3 (métrica
de R6 de la adenda 04), H7.1 (sección de decisiones bloqueadas tras los
hallazgos) y H8.1-H8.2; el 05 pasa de instrucción a estado (cinco ramas
implementadas y consumidas, sin interfaz de continuos).

**Ojo: estos ficheros no viven en el repositorio** (DUDA 45). Se
entregaron como ficheros del hilo y hay que sustituir los adjuntos del
agente constructor y del proyecto de diseño. Si lees esto en un hilo
nuevo y los adjuntos 00/02/05 no llevan el registro de cambios del 4b al
final, avisa: te pasaron la especificación vieja.

### Parte 2 — Alta y edición de decisiones

- `web/src/lib/decisiones.ts` — `validarDatosDecision`: título
  obligatorio (máximo 200), opciones una por línea con recorte, descarte
  de vacías y deduplicación exacta, al menos dos (R6 literal: con una no
  hay decisión), quién bloquea opcional (vacío queda nulo).
- `web/src/lib/servicio-proyectos.ts` — `crearDecision` (nace abierta,
  `abierta_desde` en la creación; archivado la rechaza, pausado la
  admite) y `actualizarDecision` (solo abiertas: las cerradas son
  registro histórico; edita título, opciones y bloqueado_por en
  transacción). Validación siempre en servidor.
- `web/src/app/(app)/proyectos/acciones.ts` — `crearDecisionAction` y
  `editarDecisionAction` con eco de valores al fallar (DUDA 32) y avisos
  `?decision=creada|editada` que la página del proyecto pinta.
- `web/src/components/decisiones-abiertas.tsx` — botón Nueva decisión
  con formulario en la propia sección (también con la lista vacía) y
  Editar en cada fila, junto a Cerrar decisión. Campos compartidos entre
  alta y edición.
- Efecto buscado: editar las opciones de una abierta permite añadir la
  ganadora antes de cerrar, mitigando el límite de la DUDA 16 sin campo
  libre (test del flujo completo).

### Parte 3 — Rechazos por límite de WIP persistidos

- **Primera migración desde el encargo 2**:
  `web/prisma/migrations/20260826084125_wip_rejections` crea
  `wip_rejections` (id, user_id, task_id con cascada, limite, created_at).
- `web/src/lib/servicio-tareas.ts` — el rechazo de `cambiarEstadoTarea`
  crea el registro dentro de la misma transacción, con el límite vigente
  de R1. Devolver sin lanzar no revierte: el registro persiste aunque la
  transición no ocurra. Con R1 desactivada no hay validación, ni rechazo,
  ni registro (DUDA 44). `rechazosDeWip(db, rango?)` es la consulta para
  el encargo 5: el numerador de la métrica de R1; el denominador sale de
  los TaskEvent hacia en_curso.
- `web/prisma/seed.ts` — tres rechazos plausibles (dos de la semana
  pasada, uno de esta) sobre tareas de semana, con límite 3. El resumen
  del seed imprime `rechazos_wip`.

### Tests y verificación

- Unitarios: `validarDatosDecision` (5 casos en
  `src/lib/decisiones.test.ts`).
- Integración: alta y edición en `web/tests/decisiones.test.ts` (alta
  limpia, rechazos de servidor, archivado frente a pausado, flujo de la
  opción ganadora añadida, cerrada intocable) y rechazos de WIP en
  `web/tests/tareas.test.ts` (rechazo registra con límite, insistir
  registra otro, transición válida no registra, consulta por rango, R1
  apagada no registra). Van en esos ficheros a propósito: vitest corre
  los ficheros en paralelo y así lo que toca R1 o decisiones queda
  serializado con sus vecinos.
- `npm test`: 148/148 (12 nuevos). `tsc --noEmit` limpio.
- `comprobar-rutas.mjs`: 38 comprobaciones (nueva: el detalle de proyecto
  muestra Nueva decisión y Editar).
- `verificar-visual.mjs`: además de todo lo anterior, abre el alta y la
  edición de decisión en ambos tamaños, sin desbordamiento y con consola
  limpia.

## Qué decidí

DUDAS 42 a 45 nuevas; la 15 queda resuelta en parte y la 16 mitigada.
Resumen: solo se editan abiertas (42); el alta exige dos opciones y
deduplica exacto (43); los rechazos se registran solo cuando R1 valida,
con el límite vigente, y producción acumula los suyos desde cero (44);
la especificación sincronizada vive en el conocimiento del agente, no en
el repositorio (45).

## Qué quedó fuera

- Vista de decisiones cerradas y estado `caducada` (DUDA 15, sigue).
- Alta o cierre de decisiones desde la pantalla Hoy: el cierre sigue solo
  en el detalle del proyecto.
- La métrica de adherencia de R1 y su interfaz: este encargo deja el
  origen de datos; la métrica es del encargo 5.
- Edición de `abierta_desde` y del estado de una decisión.
- Cualquier historia nueva en la especificación: la parte 1 solo alinea.

## Qué falta verificar a mano

- **Sustituir los adjuntos 00, 02 y 05** del agente constructor (y del
  proyecto de diseño) por los ficheros entregados en el hilo. Hasta
  entonces, los agentes leerán la especificación desincronizada.
- **El alta y la edición en producción con tu sesión**: crear una
  decisión con dos opciones y quién la bloquea, editarla para añadir una
  tercera, cerrarla eligiendo la añadida. El aviso debe decir "Decisión
  registrada" y "Decisión editada".
- **La migración en producción**: el despliegue ejecuta
  `prisma migrate deploy` en el preDeployCommand; comprueba en el panel
  que el deploy pasó el health check. La tabla `wip_rejections` empieza
  vacía en producción (el seed no se relanza): fuerza un rechazo real
  (con 3 en curso, intenta una cuarta) si quieres ver el primer registro.

## Verificación criterio a criterio

| Criterio | Cumple | Nota |
|---|---|---|
| 00, 02 y 05 alineados con DUDAS 1-41 sin cambiar alcance | Sí | Sin historias nuevas; registro de cambios al final de cada fichero |
| Cada documento indica qué cambió y por qué | Sí | Sección "Registro de cambios" con la DUDA que motiva cada edición |
| Alta de decisión con título, opciones y quién bloquea | Sí | Formulario en la sección de decisiones; validación en servidor |
| Edición de decisiones existentes | Sí | Solo abiertas (DUDA 42); test de que una cerrada no se toca |
| Al menos dos opciones consideradas (R6) | Sí | Unitario e integración; deduplicación exacta |
| Rechazos de WIP persistidos como registros | Sí | En la transacción del rechazo, con el límite vigente |
| Origen de datos listo para la métrica de R1 del encargo 5 | Sí | rechazosDeWip por rango + TaskEvent como denominador |
| R1 desactivada no registra intentos | Sí | Test con la regla apagada |
| Migración versionada, sin cambios de esquema fuera de migración | Sí | 20260826084125_wip_rejections |
| Test del criterio principal | Sí | 148/148 (12 nuevos) |
| Sin errores en consola | Sí | Playwright, incluidos los formularios nuevos |
| Correcto a 375px | Sí | Alta y edición verificados en ambos tamaños |
| Español de España, sin exclamaciones ni emojis | Sí | Interfaz, mensajes y documentos |
| Datos de ejemplo en el seed | Sí | 3 rechazos de WIP; las 17 decisiones ya estaban |
