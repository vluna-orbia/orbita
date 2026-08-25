# ENTREGA — Encargo suelto · Pantalla Hoy reducida

Escrito para el agente del encargo siguiente, que no ha visto este hilo.
Este fue un encargo suelto que adelanta parte de H7.1: no es el encargo 5
del documento 03 (rituales y métricas de adherencia, que siguen enteros
por hacer) ni la pantalla Hoy completa del encargo 7.

## Qué construí

Cuatro secciones en `/hoy`, en este orden, cada una omitida por completo
cuando no tiene contenido (solo la de sesión está siempre):

1. **En curso** — las tareas en estado en_curso, con las bloqueadas
   marcadas en ámbar con su motivo. Reutiliza la fila de tarea del
   encargo 4 tal cual: casilla de hecha, transiciones, aviso de WIP y
   petición de siguiente paso funcionan desde Hoy (las actions ya
   revalidaban /hoy).
2. **Sesión** — la sesión activa con cronómetro vivo (desde startedAt del
   servidor, como el lateral), intención y botón de cierre; o el botón de
   empezar si no hay ninguna.
3. **Notas de cierre de ayer** — sesiones terminadas en el día civil de
   ayer en Europe/Madrid con su nota: avance, bloqueo, siguiente paso,
   proyecto, duración; las abandonadas anotadas van marcadas.
4. **Decisiones bloqueadas** — decisiones abiertas por encima del umbral
   de R6, con quién las bloquea, ordenadas de más antigua a menos. Cada
   título enlaza al detalle del proyecto, donde vive el cierre.

Ficheros principales:

- `web/src/lib/servicio-hoy.ts` — las tres consultas nuevas:
  `tareasEnCursoDeHoy` (misma forma que la lista de tareas),
  `notasDeAyer` y `decisionesSobreUmbral` (devuelve null con R6
  desactivada: la sección desaparece entera). Todo validado en servidor
  y leyendo el playbook en cada petición, como en los encargos 3 y 4.
- `web/src/lib/semana.ts` — `instanteInicioDeDia` y `rangoDeAyer`
  nuevos: el día civil de ayer en Europe/Madrid como rango [inicio, fin)
  de instantes, con los cambios de hora absorbidos (23 o 25 horas).
- `web/src/components/sesion-hoy.tsx`, `notas-de-ayer.tsx` y
  `decisiones-hoy.tsx` — las secciones 2, 3 y 4.
  `cronometro-sesion.tsx` exporta ahora `useSegundos` para el cronómetro
  de la tarjeta.
- `web/src/app/(app)/hoy/page.tsx` — reescrita: cabecera del documento
  01 (fecha y "Tres cosas hoy" en Instrument Serif) y las cuatro
  secciones condicionales, con una línea de invitación solo si 1, 3 y 4
  están vacías a la vez.
- `web/prisma/seed.ts` — las sesiones admiten `semana: "ayer"`, ancladas
  al día civil anterior a la siembra: la sección 3 nunca nace vacía, se
  siembre el día que se siembre. Una sesión nueva de Órbita la usa; el
  seed pasa de 11 a 12 sesiones.

## Qué decidí

Las decisiones nuevas están en DUDAS.md 37 a 41; la DUDA 31 queda
actualizada con el avance parcial. Las que condicionan encargos:

- **Sección 1 literal**: las en_curso a secas, sin completar hasta tres
  con las de semana de mayor prioridad. Esa lógica de "las tres cosas de
  hoy", los hallazgos, los resultados comprometidos, los avisos y los
  anillos de la cabecera son del encargo 7 (DUDAS 37 y 41).
- **H1.3 aplicada al brief diario entero** (DUDA 38): proyectos en pausa
  o archivados fuera de las tres consultas; tareas sin proyecto, dentro.
- **Ayer es el día civil de Madrid con corte exclusivo en la medianoche
  de hoy** (DUDA 39), y solo cuentan las sesiones con nota escrita.
- **R6 desactivada elimina la sección de decisiones; el umbral es
  estricto** ("más de 21" excluye la de exactamente 21) y se lee de
  `parametros.dias_umbral` en cada petición (DUDA 40). Reutiliza
  `umbralDiasR6` del encargo 3: una sola fuente para el umbral.
- **Ninguna migración**: todo cabía en el esquema existente.

## Qué quedó fuera

- Hallazgos del radar y resultados comprometidos: lo pide el encargo (no
  existen todavía como contenido del brief diario).
- Las secciones 1, 5 y 6 de H7.1 completas: tres cosas de hoy con
  prioridad, resultados con avance, avisos (ritual pendiente, bloqueadas
  de más de 3 días, umbral de coste, propuesta de playbook).
- Anillos orbitales en la cabecera del brief diario (documento 01): van
  con la pantalla completa (DUDA 41).
- Los rituales y las métricas de adherencia (encargo 5 del documento 03,
  intacto).

## Qué falta verificar a mano

- **La pantalla Hoy en producción con tus datos.** Producción no se
  resiembra (DUDA 36): la sección de notas solo saldrá si ayer cerraste
  una sesión con nota ahí, y la de en curso solo con tareas en curso
  tuyas. Las 17 decisiones del seed del encargo 2 sí están en producción,
  así que la sección de decisiones bloqueadas debería verse con la lista
  de a quién perseguir. Comprueba de paso que las secciones sin datos no
  dejan hueco: se omiten enteras.
- **El flujo de sesión desde Hoy en producción**: empezar desde la
  sección 2, ver el cronómetro en la tarjeta y en el lateral a la vez,
  recargar, cerrar desde la tarjeta. En móvil, la tarjeta convive con la
  barra superior.
- **El enlace de cada decisión** lleva al detalle de su proyecto, donde
  se cierra. Si prefieres cerrar decisiones desde Hoy sin saltar, es una
  historia nueva.

## Verificación criterio a criterio

El encargo suelto no tiene historia propia en el documento 02; la tabla
recoge sus criterios literales más la definición de terminado.

| Criterio | Cumple | Nota |
|---|---|---|
| Cuatro secciones en el orden pedido | Sí | Orden comprobado por rutas con los aria-label de las secciones |
| Tareas en curso con las bloqueadas marcadas | Sí | Fila del encargo 4; motivo en ámbar; test de integración |
| Se excluyen tareas de proyectos en pausa (H1.3) | Sí | Test; las sin proyecto entran |
| Sesión activa o botón de empezar | Sí | Cronómetro desde startedAt; verificado con Playwright: empezar, recargar, cerrar |
| Notas de cierre de ayer en día civil Europe/Madrid | Sí | rangoDeAyer con tests de borde: medianoche exclusiva y cambios de hora de marzo y octubre |
| Solo sesiones con nota; abandonadas anotadas marcadas | Sí | Test de integración |
| Decisiones por encima del umbral de R6 con quién bloquea | Sí | Umbral estricto; ordenadas por días; bloqueado_por visible |
| R6 desactivada elimina la sección; umbral de parametros | Sí | Tests con la regla apagada y con dias_umbral en 25 |
| Secciones vacías omitidas por completo | Sí | Render condicional; tests de exclusión por sección |
| Hallazgos y resultados comprometidos omitidos | Sí | No aparecen en la pantalla |
| Documento 01: tokens, tipografía, voz | Sí | Cabecera serif, datos en mono con tabular-nums, coral solo en acción y sesión viva |
| Test del criterio principal | Sí | 136/136 (14 nuevos: 6 unitarios de semana y 8 de integración de Hoy) |
| Sin errores en consola | Sí | Playwright en todas las rutas y en el flujo de sesión desde Hoy |
| Correcto a 375px | Sí | Sin desbordamiento; capturas en dos tamaños |
| Español de España, sin exclamaciones ni emojis | Sí | Interfaz y seed |
| Datos de ejemplo en el seed | Sí | 12 sesiones (una anclada a ayer), 3 en curso con una bloqueada, 17 decisiones |
