# ENTREGA — Encargo 4 · Tareas, WIP y sesiones

Escrito para el agente del encargo 5, que no ha visto este hilo.
Historias cubiertas: H2.1 a H2.6 y H3.1 a H3.4.

## Qué construí

### Dominio y servicio (todo validado en servidor, regla 7)

- `web/src/lib/tareas.ts` — la máquina de estados como funciones puras:
  inbox → backlog → semana → en_curso → hecha, descartada desde cualquier
  estado no terminal, solo semana entra a en_curso, en_curso vuelve a
  semana (H2.4) y hecha se alcanza desde en_curso y también desde semana
  (DUDAS 26). Además: `interpretarCaptura` (arroba por prefijo contra
  nombre y slug, DUDAS 29), `validarBloqueo` y `estaBloqueada` (bandera
  por motivo, DUDAS 34), y los mensajes literales de la interfaz.
- `web/src/lib/sesiones.ts` — duración calculada desde started_at en el
  servidor, `esHuerfana` con umbral de 4 horas sobre la última actividad
  conocida (el latido, DUDAS 27), validación de arranque (intención
  obligatoria) y de la nota de cierre: avance siempre, siguiente paso
  solo mientras R3 esté activa (DUDAS 33). Formatos del cronómetro.
- `web/src/lib/servicio-tareas.ts` — la capa que consumen las server
  actions y los tests: `capturarTarea` (inbox + evento de creación),
  `cambiarEstadoTarea` (transición + TaskEvent + completed_at en
  transacción; el rechazo por WIP devuelve las tareas en curso para el
  aviso; volver a semana sin siguiente paso devuelve pideSiguientePaso),
  `limiteWip` (R1 del playbook: parametros.limite, regla desactivada →
  validación desactivada, como R2 y R6 en el encargo 3),
  `tareasEnCursoQueCuentan` (excluye bloqueadas, proyectos no activos y
  consume `tareasCuentanParaWip` de reglas-proyecto), bloqueos, edición
  de campos y `listaDeTareas` con los filtros de H2.6.
- `web/src/lib/servicio-sesiones.ts` — `sesionActiva` (con detección
  perezosa de huérfanas al leer), `empezarSesion` (una sola activa; una
  huérfana no bloquea el arranque), `latidoDeSesion` (updated_at como
  última actividad), `cerrarSesion` (duración desde started_at, nota
  validada con R3, copia del siguiente paso a la tarea vinculada, las
  abandonadas conservan su duración congelada y siguen contando como
  abandonadas), `sesionesPendientesDeNota` y `historialDeSesiones`
  (por proyecto y semana Europe/Madrid: número, minutos, % con nota).
- Server actions finas en `web/src/app/(app)/tareas/acciones.ts` y
  `web/src/app/(app)/sesiones/acciones.ts`. Las de sesión revalidan el
  layout entero (el cronómetro vive en el lateral). Las actions devuelven
  lo escrito cuando fallan: React resetea los formularios tras cada envío
  y sin ese eco una validación fallida borraba la nota (DUDAS 32).

### Interfaz

- `web/src/components/capa-global.tsx` — montada en el layout: atajos c,
  s y g p (inactivos escribiendo en un campo o con modificadores), el
  overlay de captura, los modales de sesión y la petición de nota de las
  abandonadas. El latido del cronómetro (cada 5 min) vive aquí porque la
  capa se monta una sola vez.
- `web/src/components/captura-global.tsx` — campo único con foco, Enter
  crea en inbox y vacía el campo para seguir capturando, Escape cierra;
  la confirmación dice a qué proyecto se asignó si hubo arroba.
- `web/src/components/empezar-sesion.tsx` y `cerrar-sesion.tsx` —
  arranque con intención, proyecto y tarea opcional filtrada; cierre con
  los tres campos de H3.2. `nota-pendiente.tsx` pide la nota de las
  abandonadas al entrar, posponible. `boton-empezar-sesion.tsx` en Hoy:
  única superficie de arranque en móvil (DUDAS 30).
- `web/src/components/cronometro-sesion.tsx` — el cronómetro del lateral
  (coral, tabular-nums, intención debajo) y la barra fija superior de
  móvil. Pinta desde startedAt del servidor: recargar no pierde tiempo.
  El layout `(app)/layout.tsx` lee sesión, pendientes y R3 en cada render.
- `web/src/app/(app)/tareas/page.tsx` — vista filtrable: proyecto,
  estado (por defecto oculta terminadas), vencimiento (todas, vencidas,
  próximos 7 días) y agrupación por estado o proyecto, todo en la URL
  (`filtros-tareas.tsx`). Contador "En curso n de límite" en cabecera.
- `web/src/components/fila-tarea.tsx` — fila del documento 01: casilla,
  chip de proyecto con su color, siguiente paso en tenue, estimación en
  mono, barra coral de 3px en curso, bloqueo en ámbar, vencida en rojo.
  Las transiciones se despachan desde la fila; el rechazo por WIP pinta
  el aviso con las tres en curso y botones Cerrar y A semana ahí mismo
  (H2.3), y volver a semana sin siguiente paso despliega el campo en
  línea (H2.4).
- `web/src/app/(app)/tareas/[id]/page.tsx` — detalle: estado y acciones,
  bloqueo (`bloqueo-tarea.tsx`), campos editables (`formulario-tarea.tsx`)
  y el historial completo de transiciones con fechas (H2.2).
- `web/src/app/(app)/proyectos/[slug]/page.tsx` — sección nueva
  Sesiones: tabla por semana con número, minutos y % con nota (H3.4).
- `barra-movil.tsx` — Capturar abre la captura real (DUDAS 8 resuelta).

### Seed y datos

- `web/prisma/seed.ts` — 36 tareas repartidas por estados con contenido
  de los briefs de la adenda 04, 99 TaskEvents retro-generados (DUDAS 20
  resuelta) y 11 sesiones de dos semanas (cerradas con nota, una antigua
  sin siguiente paso y una abandonada ya anotada; ninguna activa). Las
  tareas nuevas en semana o en curso van solo a proyectos sin resultado
  comprometido: las fracciones del anillo de Yajoma (1/3) y Cribo (1/2)
  que asertan los tests del encargo 3 no cambian. Hay 2 en curso que
  cuentan para el WIP: queda una plaza libre, y la tercera que se empiece
  llena el cupo para ver el aviso. Una tarea bloqueada (con bloqueante) y
  una vencida para los filtros.
- Esquema sin cambios y sin migraciones nuevas: Task, TaskEvent y
  WorkSession existían desde el encargo 2.

### Tests y verificación

- Unitarios: `tareas.test.ts` (tabla de transiciones, captura con
  arroba, bloqueos) y `sesiones.test.ts` (huérfanas con latido, nota con
  R3 encendida y apagada, formatos).
- Integración contra la base (crean sus datos y los borran):
  `web/tests/tareas.test.ts` — captura con evento, arroba, log completo,
  la cuarta en curso rechazada llamando directamente al servicio (la API
  sin cliente) con las tres actuales devueltas y sin evento fantasma,
  bloqueadas que liberan plaza, proyecto en pausa que ni cuenta ni
  valida, R1 desactivada que desactiva el límite de verdad, siguiente
  paso obligatorio al volver a semana, filtros; `web/tests/sesiones.test.ts`
  — una sola activa, duración desde started_at (SQL crudo retrasa el
  arranque 50 min), R3 con doble cierre rechazado, copia del siguiente
  paso a la tarea, huérfana a las 4 horas con nota pendiente que al
  escribirse sigue contando como abandonada, latido que aplaza la
  detección, historial ordenado por semanas.
- `npm test`: 122/122 (73 previos + 49 nuevos). `tsc --noEmit` limpio.
- `web/scripts/comprobar-rutas.mjs` — 33 comprobaciones: filtros por
  URL, detalle con historial, 404 de tarea inexistente.
- `web/scripts/verificar-visual.mjs` — además de las trece rutas a
  375x812 y 1440x900: captura con la tecla c (y con el botón móvil),
  campo que se vacía tras Enter, sesión completa a 1440 (tecla s,
  cronómetro que sobrevive a una recarga, cierre sin siguiente paso
  rechazado por R3 con la nota conservada, cierre correcto) y el atajo
  g p. Consola sin errores y sin desbordamiento horizontal.

## Qué decidí

Las decisiones nuevas están numeradas y explicadas en DUDAS.md 26 a 36.
Las que condicionan encargos siguientes:

- **R1 y R3 se leen del playbook en cada operación** (como R2 y R6 en el
  encargo 3): el interruptor de H5.1 ya funciona sin su pantalla. Las
  métricas de adherencia del encargo 5 tienen los datos: sesiones con
  nota y abandonadas contabilizables aparte. Ojo: los intentos de
  saltarse el WIP no se persisten (un rechazo no deja evento); la
  métrica R1 de H5.3 pedirá registrar el intento.
- **Hecha también desde semana** (DUDAS 26): la casilla de la fila no
  fuerza a pasar por el límite de WIP.
- **La huérfana congela su duración hasta el último latido** y, aunque
  se le escriba la nota después, sigue siendo `abandonada` para las
  métricas (H3.3 literal).
- **El arranque de sesión exige proyecto** (el esquema lo exige) y la
  tarea vinculada tiene que ser de ese proyecto.
- **Ninguna migración**: todo cabía en el esquema del encargo 2.

## Qué quedó fuera

- Registro del intento de saltarse el WIP (lo pedirá la métrica R1 de
  H5.3; hoy el rechazo no persiste nada).
- El destacado en el brief diario del siguiente paso y de las bloqueadas
  de más de 3 días (H2.4, H2.5): son de la pantalla Hoy del encargo 7.
  Los datos quedan listos.
- Triaje guiado del inbox, rituales y métricas de adherencia (encargo
  5). Radar e intents (encargo 6). Notas de proyecto (H1.5).
- Autocompletado de la arroba en la captura (DUDAS 29), edición de
  decisiones, y todo lo de la lista prohibida.

## Qué falta verificar a mano

- **El flujo completo de sesión en producción con tu sesión**: empezar
  con s o desde Hoy, ver el cronómetro en el lateral, recargar, cerrar
  sin siguiente paso (debe rechazarse citando R3 y conservar lo escrito)
  y cerrar bien. En móvil: la barra superior con el cronómetro y el
  arranque desde Hoy.
- **La captura con c y con el botón Capturar del móvil**, incluida una
  con @yajoma y una con una arroba que no case.
- **El aviso de WIP en producción**: con las 2 en curso del seed, empieza
  una tercera y luego intenta una cuarta; deben ofrecerse las tres para
  cerrar o devolver a semana desde el propio aviso.
- **Producción no se resiembra** (DUDAS 36): el despliegue solo actualiza
  código. Si quieres los datos de ejemplo del encargo 4 en producción,
  dilo y decidimos cómo sembrarlos sin pisar los tuyos.
- **El latido y las huérfanas en condiciones reales**: deja una sesión
  abierta con la pestaña cerrada más de 4 horas y comprueba que al volver
  se pide la nota y la duración es la esperada (margen de 5 minutos).

## Verificación criterio a criterio

| Criterio | Cumple | Nota |
|---|---|---|
| H2.1 tecla c desde cualquier pantalla abre campo único con foco | Sí | Overlay global; en móvil, botón Capturar de la barra (DUDAS 8) |
| H2.1 Enter crea en inbox sin proyecto y vacía el campo | Sí | Test de integración y verificación visual del vaciado |
| H2.1 @nombre asigna proyecto en línea, nunca obligatorio | Sí | Prefijo contra nombre y slug; sin coincidencia, queda como texto |
| H2.2 estados y flujo con descartada desde cualquier punto | Sí | Tabla de transiciones con test unitario exhaustivo |
| H2.2 solo se pasa a en_curso desde semana | Sí | Testeado contra los seis estados de origen |
| H2.2 hecha registra completed_at | Sí | Test de integración |
| H2.2 log de transiciones visible en el detalle | Sí | TaskEvent por transición, creación incluida; seed retro-generado |
| H2.3 la cuarta en curso se rechaza con el mensaje literal | Sí | "Ya tienes 3 tareas en curso. Cierra una antes de empezar otra." |
| H2.3 el aviso ofrece las tres en curso para cerrar o devolver | Sí | En el propio aviso, con siguiente paso en línea si hace falta |
| H2.3 validado en servidor, no solo en la interfaz | Sí | Test que llama directamente al servicio saltándose el cliente |
| H2.3 límite configurable por R1; desactivar desactiva | Sí | parametros.limite; test con la regla apagada |
| H2.4 siguiente_paso pedido al volver de en_curso a semana | Sí | Campo en línea en fila y aviso; test de rechazo y guardado |
| H2.4 visible en fila y en brief diario | Parcial | En fila y detalle sí; el brief diario es del encargo 7 (DUDAS 31) |
| H2.5 bloqueo con motivo y tarea bloqueante opcional | Sí | Bandera sobre no terminales; seed con ejemplo enlazado |
| H2.5 bloqueadas no cuentan para el WIP | Sí | Test: bloquear libera plaza, desbloquear la recupera |
| H2.5 destacadas en brief diario a los 3 días | Parcial | Datos listos (motivo y updated_at); pantalla del encargo 7 |
| H2.6 filtros por proyecto, estado y vencimiento en la URL | Sí | También sin-proyecto; comprobado por rutas con contenido |
| H2.6 agrupación por proyecto o estado a elección | Sí | Parámetro agrupar en la URL |
| H3.1 arranque con intención declarada y tarea opcional | Sí | Intención obligatoria; tarea filtrada por proyecto |
| H3.1 cronómetro visible en el lateral en todas las pantallas | Sí | Y barra superior en móvil; sobrevive a recargas (verificado) |
| H3.1 una sola sesión activa | Sí | Rechazo en servidor con transacción; test |
| H3.2 cierre con avance, bloqueo opcional y siguiente paso | Sí | El error de R3 conserva lo escrito (DUDAS 32) |
| H3.2 sin siguiente paso no se cierra mientras R3 activa | Sí | Test con R3 encendida y apagada |
| H3.2 el siguiente paso se copia a la tarea vinculada | Sí | Test de integración |
| H3.3 huérfana a las 4 horas, duración hasta última actividad | Sí | Latido cada 5 min; detección perezosa al entrar (DUDAS 27) |
| H3.3 pide la nota la próxima vez que entro | Sí | Modal posponible; al anotarla sigue contando como abandonada |
| H3.4 historial por proyecto y semana | Sí | Sesiones, minutos y % con nota, en el detalle del proyecto |
| Cronómetro desde started_at en servidor, no acumulado en cliente | Sí | Test con SQL crudo que retrasa started_at 50 minutos |
| Atajos c, s y g p | Sí | Inactivos al escribir en un campo; g p verificado con Playwright |
| Test del criterio principal | Sí | 122/122 (49 nuevos entre unitarios e integración) |
| Sin errores en consola | Sí | Playwright en todas las rutas y en los flujos de captura y sesión |
| Correcto a 375px | Sí | Sin desbordamiento; capturas en dos tamaños |
| Español de España, sin exclamaciones ni emojis | Sí | Interfaz, mensajes y seed |
| Datos de ejemplo en el seed | Sí | 36 tareas, 99 eventos, 11 sesiones; nada se ve vacío |
