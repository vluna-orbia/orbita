# ENTREGA — Encargo 5 · Rituales semanales y Playbook

Escrito para el agente del encargo siguiente (el 6 del documento 03, el
motor de investigación, que sigue entero por hacer). Cubre las historias
H4.1, H4.2, H4.3, H5.1, H5.2 y H5.3: la planificación semanal en cuatro
pasos, la retrospectiva con métricas reales, el aviso de ritual
pendiente, el Playbook versionado con interruptor efectivo y las seis
métricas de adherencia con sus barras de ocho semanas.

## Qué construí

### Parte 1 — Planificación semanal guiada (H4.1)

- `web/src/lib/servicio-rituales.ts` — el servicio entero del ritual:
  `elementosDelInbox`, `triarEnRitual` (a proyecto y backlog o semana, o
  descartar; el evento queda marcado `via_ritual`), `avanzarTrasTriaje`
  (el bloqueo del paso 1: con el inbox sin vaciar no se avanza; crea el
  WeeklyPlan con `completado_paso` 1), `guardarProyectosActivos` (límite
  leído de `parametros.limite` de R2 vía `limiteDeActivos`; los elegidos
  a activo y el resto a pausa en la misma transacción),
  `guardarResultados` (una frase por proyecto activo; conserva el
  cumplido al reeditar) y `guardarTareasDeLaSemana` (backlog ↔ semana
  con eventos del ritual; deja `completado_paso` 4).
- `web/src/app/(app)/rituales/planificacion/page.tsx` — el asistente:
  un paso por pantalla, chips de navegación con retroceso libre hasta lo
  alcanzado, reanudación por `completado_paso` y modo edición si el plan
  de la semana ya está completo (se entra por el paso 1 y no se
  duplica: `semana_inicio` es único). Los recordatorios de las reglas
  propias aparecen en el paso de su categoría.
- `web/src/components/ritual/paso-triaje.tsx`, `paso-proyectos.tsx`,
  `paso-resultados.tsx`, `paso-tareas.tsx` — los cuatro pasos, con eco
  de errores del servidor (patrón de la DUDA 32).
- `web/src/app/(app)/rituales/page.tsx` — la puerta de los rituales:
  estado de cada uno, retomar por el paso que toca, avisos de hecho.

### Parte 2 — Retrospectiva (H4.2)

- `servicio-rituales.ts` — `metricasDeLaSemana` (tareas completadas,
  sesiones, minutos, porcentaje con nota, intentos de saltar el WIP
  desde `wip_rejections`; sesiones agrupadas por su arranque, como
  H3.4), `marcarResultado` (cumplido o no, sin opción intermedia),
  `guardarRetro` (upsert con la foto de las métricas en `metricas`) y
  `convertirCambioEnRegla` (qué cambio pruebo → regla propia de
  categoría revisión, versión nueva del playbook).
- `web/src/app/(app)/rituales/retrospectiva/page.tsx` — resultados con
  dos botones, cifras grandes en serif (documento 01) y los tres campos
  libres; el botón de convertir aparece cuando qué cambio pruebo lleva
  texto (`web/src/components/ritual/formulario-retro.tsx`).

### Parte 3 — Aviso de ritual pendiente (H4.3)

- `servicio-rituales.ts` — `avisoDeRitual` (lunes sin plan completo:
  aviso y atenuar; viernes con plan y sin retro: aviso sin atenuar) y
  `posponerRitual` (silencia el día civil en curso).
- `web/src/app/(app)/hoy/page.tsx` — el banner en cabecera con Hacer y
  Posponer hasta mañana; el resto de la pantalla al 40% de opacidad
  cuando toca atenuar.
- Migración `20260826101253_ritual_playbook`: tabla `ritual_snoozes` y
  columna `via_ritual` en `task_events`.

### Parte 4 — Playbook (H5.1, H5.2)

- `web/src/lib/playbook.ts` — dominio puro: categorías, claves de
  reglas propias (R7 en adelante, sin reutilizar), validación de texto
  y parámetros (`limite` en R1 y R2, `dias_umbral` en R6) y
  `diffDeVersiones` para el historial.
- `web/src/lib/servicio-playbook.ts` — `versionVigente`,
  `recordatoriosDelPlaybook` y `crearVersionConCambio`: cada mutación
  (alternar, editar, añadir, retirar) copia las reglas a una versión
  nueva conservando la fecha de alta, con motivo del usuario o
  automático. Las validaciones (limiteWip, limiteDeActivos, r3Activa,
  umbralDiasR6) ya leían la última versión: el interruptor desactiva la
  validación de verdad, verificado de punta a punta.
- `web/src/app/(app)/playbook/page.tsx` — las seis reglas base con
  texto, categoría, fecha de alta, parámetros, interruptor y la barra
  fina de cuatro semanas (documento 01); reglas propias con retirar;
  retiradas tachadas en un histórico plegable.
- `web/src/app/(app)/playbook/[clave]/page.tsx` — la ficha: definición
  exacta de la métrica y las barras de ocho semanas.
- `web/src/app/(app)/playbook/versiones/page.tsx` — el historial con
  fecha, motivo y qué cambió en cada versión.

### Parte 5 — Métricas de adherencia (H5.3)

- `web/src/lib/adherencia.ts` — las seis fórmulas, cada una una función
  pura con su test: R1 rechazos persistidos / TaskEvent a en_curso; R2
  activos del plan de la semana ≤ `parametros.limite` (nunca un 3 en
  duro); R3 cerradas con nota / total, abandonadas sin puntuar; R4
  procesados en el ritual (`via_ritual`) / capturados; R5 cumplidos /
  comprometidos, sin dato hasta la retro; R6 cerradas con motivo /
  cerradas. Semanas civiles de lunes en Europe/Madrid
  (`rangoDeSemanaPura` y `ultimasSemanas` nuevos en `semana.ts`).
- `web/src/lib/servicio-adherencia.ts` — el job semanal perezoso:
  materializa las semanas cerradas en `adherence_metrics` al leer la
  ficha (idempotente, la semana en curso al vuelo). Ver DUDA 46.
- `web/src/components/barras-adherencia.tsx` — las barras de ocho
  semanas con porcentaje y fracción cruda, y la tira fina de cuatro.

### Tests y verificación

- Unitarios: 24 nuevos (`src/lib/adherencia.test.ts`, las seis fórmulas
  y las barras; `src/lib/playbook.test.ts`, claves, validación y diff).
- Integración: 25 nuevos (`tests/rituales.test.ts`: bloqueo del paso 1,
  triaje marcado, límite del paso 2 leído del playbook y cambiado en
  caliente, pausa del resto, resultados con cumplido conservado, paso 4
  con eventos, sin duplicar plan, retro con foto de métricas,
  conversión en regla, avisos del lunes y el viernes con posponer;
  `tests/playbook.test.ts`: el interruptor apaga limiteWip, r3Activa y
  umbralDiasR6 de verdad, edición de parámetros, propias, historial,
  fecha de alta conservada; `tests/adherencia.test.ts`: cada métrica
  contra la base, R2 con el límite editado, materialización idempotente
  y semana en curso sin persistir). Los tests restauran proyectos,
  inbox, tareas y versiones: el seed queda como estaba.
- `npm test`: 197/197 (49 nuevos), dos pasadas seguidas en verde.
  `tsc --noEmit` limpio. `next build` limpio.
- Verificación visual con Playwright: 13 rutas × 2 tamaños (375x812 y
  1440x900), sin desbordamiento horizontal ni errores de consola, y el
  interruptor de R4 ejercitado desde el navegador (versión 1 → 3).

## Qué decidí

- **El paso 1 bloquea el avance** (H4.1 literal, confirmado por el
  usuario en el plan): es flujo del asistente, no la validación blanda
  de R4; desactivar R4 no lo relaja. Descartar cuenta como procesado.
  DUDA 6 actualizada.
- El "job semanal" es un cálculo perezoso idempotente materializado en
  `adherence_metrics`; las semanas cerradas quedan como foto (DUDA 46).
- Las métricas miden contra el parámetro vigente de la última versión;
  una regla desactivada conserva ficha y barras (DUDA 47).
- R2 se evalúa contra el plan de cada semana y R5 exige retro; semana
  sin plan o sin retro queda sin dato (DUDA 48).
- R1 y R4 pueden superar el 100%: fracción cruda en la ficha, barra
  recortada y la de R1 invertida (DUDA 49).
- En el triaje del ritual, backlog o semana exigen proyecto (DUDA 50).
- El paso 2 no impone mínimo; continuos sin plaza; R2 apagada sin tope
  (DUDA 51). Editar el plan puede retirar resultados (DUDA 52).
- Reglas propias: solo ellas se retiran; recordatorios por categoría;
  la conversión desde la retro nace en revisión (DUDA 53). Motivo
  automático si no se escribe (DUDA 54).
- Posponer silencia el día civil; el viernes solo avisa con plan
  completo y retro pendiente (DUDA 55).
- Seed: plan y retro de la semana pasada con métricas calculadas al
  sembrar, plan de hace dos semanas con cuatro activos, triajes de
  ritual, sesiones y rechazos antiguos y tres decisiones cerradas, dos
  con motivo (DUDA 56). `WeeklyPlan.proyectos_activos` queda fijado en
  slugs (DUDA 21 resuelta).
- El documento 03 dice "cinco reglas" y "cinco métricas": es anterior a
  la adenda 04. Son seis, como fija el 02 sincronizado.

## Qué quedó fuera

- H5.4 (propuesta de mejora mensual): prioridad P, no está en las
  historias del encargo.
- Un cron real para las métricas: el job perezoso cumple el cálculo
  semanal sin infraestructura nueva; si algún día hace falta terminar
  las semanas sin esperar a una visita, es un endpoint que llame a
  `metricasDeRegla` desde un scheduler (el del engine llega con el 6).
- La vista de decisiones cerradas y el estado `caducada` (DUDA 15).
- El histórico de parámetros por semana (DUDA 47): las barras pasadas
  se leen con el límite vigente.
- Recordatorios de reglas propias fuera de los rituales.
- Editar o reactivar reglas retiradas: quedan tachadas en el histórico.

## Qué falta verificar a mano

- **El ritual completo en producción con tu sesión**: triar el inbox
  (comprobar que sin vaciarlo no deja avanzar), elegir activos (con
  cinco activos y R2 en 3 tendrás que dejar fuera dos), escribir los
  resultados, montar la semana y ver el plan reflejado en /proyectos.
- **La retrospectiva en producción**: marcar cumplido/no cumplido,
  guardar con qué cambio pruebo y convertirlo en regla; comprobar que
  la regla nueva aparece en el Playbook como R7 con su versión.
- **El aviso del lunes y del viernes reales**: el lunes que viene, Hoy
  debe amanecer atenuado con el banner; posponer debe silenciarlo hasta
  el martes. No se puede simular sin cambiar la fecha del servidor.
- **La migración en producción**: el despliegue ejecuta
  `prisma migrate deploy` (crea `ritual_snoozes` y `via_ritual`);
  comprueba que el deploy pasa el health check.
- **Las barras en producción**: producción no se resiembra, así que las
  semanas pasadas saldrán casi todas "sin dato" y se irán llenando con
  el uso real. Es lo esperado, no un fallo.

## Verificación criterio a criterio

| Criterio | Cumple | Nota |
|---|---|---|
| H4.1: cuatro pasos, uno por pantalla, con retroceso | Sí | Chips de navegación hasta el paso alcanzado |
| H4.1: paso 1 no avanza con el inbox sin vaciar; descartar cuenta | Sí | Bloqueo en servidor con test; botón deshabilitado además en la interfaz |
| H4.1: paso 2 hasta el límite y el resto a pausa automática | Sí | Límite de parametros.limite de R2; test con el límite editado a 5 y con R2 apagada |
| H4.1: paso 3 una frase por proyecto activo | Sí | Falta una y el servidor rechaza con eco |
| H4.1: paso 4 tareas del backlog de cada activo | Sí | Marcado queda en semana; desmarcado vuelve |
| H4.1: plan existente abre en edición y no se duplica | Sí | semana_inicio único; test de recuento |
| H4.1: abandonable y retomable, progreso paso a paso | Sí | completado_paso en WeeklyPlan; el hub retoma por el paso que toca |
| H4.2: cumplido / no cumplido sin opción intermedia | Sí | Dos botones por resultado |
| H4.2: métricas de la semana calculadas de verdad | Sí | Cinco cifras desde la base, intentos de WIP incluidos |
| H4.2: tres campos libres y botón de convertir en regla | Sí | El botón aparece con texto en qué cambio pruebo; test de la conversión |
| H4.3: lunes aviso en cabecera y resto atenuado hasta hacer o posponer | Sí | Opacidad 40; posponer persiste por día civil |
| H4.3: viernes igual sin atenuar | Sí | Solo con plan completo y retro pendiente |
| H5.1: seis reglas precargadas con categoría, estado, alta y parámetros | Sí | El "cinco" del documento 03 es anterior a la adenda 04 |
| H5.1: desactivar desactiva la validación de verdad | Sí | Tests de limiteWip, r3Activa y umbralDiasR6 apagados; verificado también desde el navegador |
| H5.1: reglas propias sin validación, como recordatorios | Sí | Por categoría en su ritual; alta y retirada con versión |
| H5.2: cada cambio crea versión con fecha y motivo | Sí | Motivo del usuario o automático |
| H5.2: historial completo con qué cambió | Sí | Diff por clave entre versiones consecutivas |
| H5.3: seis métricas con las definiciones exactas, cada fórmula una función con test | Sí | adherencia.ts, 24 tests unitarios |
| H5.3: R1 usa los rechazos persistidos del 4b | Sí | wip_rejections como numerador; test de integración |
| H5.3: R2 lee parametros.limite, no un 3 en duro | Sí | Test con el límite cambiado a 5 en caliente |
| H5.3: calculadas semanalmente por un job | Sí, con nota | Job perezoso idempotente materializado en adherence_metrics (DUDA 46), sin cron |
| H5.3: barras de las últimas ocho semanas en la ficha | Sí | Más la tira fina de cuatro en la tarjeta (documento 01) |
| Semana de lunes y Europe/Madrid en todos los cálculos | Sí | rangoDeSemanaPura sobre la medianoche de Madrid; tests de bordes ya existentes |
| Test del criterio principal | Sí | 197/197, 49 nuevos; dos pasadas seguidas en verde |
| Sin errores en consola | Sí | Playwright en 13 rutas × 2 tamaños |
| Correcto a 375px | Sí | Sin desbordamiento horizontal en ninguna ruta |
| Español de España, sin exclamaciones ni emojis | Sí | Interfaz, avisos y documentos |
| Datos de ejemplo en el seed | Sí | Plan y retro de la semana pasada, triajes de ritual, decisiones cerradas, sesiones y rechazos antiguos |
