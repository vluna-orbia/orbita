# ENTREGA — Encargo 3 · Proyectos y Brief Vivo

Escrito para el agente del encargo 4, que no ha visto este hilo.
Historias cubiertas: H1.1, H1.2, H1.3, H1.4, más la interfaz de la
entidad Decision (listado de abiertas y cierre) que el usuario añadió al
encargo.

## Qué construí

### Dominio y servicio (todo validado en servidor, regla 7)

- `web/src/lib/proyectos.ts` — paleta de seis acentos apagados
  (los cinco del seed más malva `#8A6A7B`), asignación automática de
  color, generación de slug y validación de campos de H1.1 (nombre
  obligatorio, cliente opcional, objetivo obligatorio de hasta 280).
- `web/src/lib/decisiones.ts` — resolución de la DUDA 2: `diasAbierta`
  calculado al leer para decisiones abiertas y congelado en la columna al
  cerrar; `validarCierre` exige opción de entre las consideradas y
  motivo (R6).
- `web/src/lib/semana.ts` — lunes de la semana en Europe/Madrid, como
  fecha pura (`WeeklyPlan.semana_inicio`) y como instantes de inicio y
  fin para filtrar timestamps. Cubre los cambios de hora.
- `web/src/lib/diff.ts` — diff de líneas (LCS) para comparar versiones.
- `web/src/lib/servicio-proyectos.ts` — la capa que consumen las server
  actions y los tests: `crearProyecto` (con el cupo lleno crea en pausa y
  avisa, no da error), `cambiarEstadoProyecto` (activar valida R2 y se
  rechaza con aviso), `guardarBrief` (versión nueva solo si cambia el
  hash normalizado, reutiliza `brief.ts`), `briefCambioDesdeDerivacion`
  (compara el hash actual con el de la versión guardada en los intents
  activos, no números de versión), `cerrarDecision`, `decisionesAbiertas`
  (ordenadas por días, descendente) y `resumenDeProyectos` (datos del
  anillo, resultado comprometido y contadores por proyecto).
  El límite de R2 y el umbral de R6 se leen del playbook
  (`parametros.limite`, `parametros.dias_umbral`); regla desactivada,
  validación desactivada. Consume `reglas-proyecto.ts`
  (`cuentaParaLimiteDeActivos`, `cierreDelAnillo`), no reescribe ramas.

### Interfaz

- `web/src/app/(app)/proyectos/page.tsx` — lista con tarjetas (anillo,
  nombre, cliente, resultado comprometido, contadores), botón Nuevo
  proyecto y filtro Archivados. Los archivados no aparecen en la vista
  principal y conservan sus datos (H1.3).
- `web/src/app/(app)/proyectos/nuevo/page.tsx` y
  `web/src/app/(app)/proyectos/[slug]/editar/page.tsx` — alta y edición
  sobre `components/formulario-proyecto.tsx` (useActionState, errores
  del servidor en línea).
- `web/src/app/(app)/proyectos/[slug]/page.tsx` — detalle: cabecera con
  anillo de 88px y acciones (Editar, Pausar/Activar, Archivar/Recuperar),
  objetivo, resultado de la semana con su avance, aviso "El brief cambió
  desde la última derivación de intents" con botón (deshabilitado hasta
  el encargo 6), brief con las seis secciones y decisiones abiertas.
- `web/src/app/(app)/proyectos/[slug]/brief/page.tsx` — editor markdown
  (`components/formulario-brief.tsx`), con plantilla de seis secciones
  para el primer brief.
- `web/src/app/(app)/proyectos/[slug]/versiones/page.tsx` — historial
  con fecha y hash corto, y comparación entre dos cualesquiera por
  parámetros de URL (?a=&b=), con el diff coloreado.
- `web/src/app/(app)/proyectos/acciones.ts` — las server actions, finas:
  validación y reglas en el servicio. El middleware exige sesión también
  en las actions.
- `web/src/components/anillo-orbital.tsx` — SVG con feTurbulence
  (baseFrequency 0.03) + feDisplacementMap (scale 3) y semilla estable
  por proyecto: trazo irregular, nunca un círculo limpio. Arco que se
  cierra con el avance; sin resultado comprometido, trazo abierto y
  discontinuo; en pausa, gris al 30%. Se dibuja una vez al cargar (600ms,
  escalonado 80ms, keyframe en `globals.css`) y prefers-reduced-motion lo
  desactiva.
- `web/src/components/decisiones-abiertas.tsx` — listado por proyecto
  con opciones consideradas, quién bloquea y días abierta (en ámbar por
  encima del umbral de R6); el cierre se abre en la propia fila: radios
  con las opciones, motivo obligatorio y botón coral.

### Seed y datos

- `web/prisma/seed.ts` — añade el plan de la semana en curso con los dos
  resultados comprometidos que declara la adenda 04 (Yajoma y Cribo) y
  cinco tareas de semana (dos hechas): el anillo tiene base de cálculo
  real. Resumen del seed: 5 proyectos, 5 briefs, 6 reglas, 17 decisiones,
  3 hitos, 1 plan, 2 resultados, 5 tareas.
- `web/scripts/sembrar-semana.ts` — la misma semana mínima como script
  idempotente y no destructivo (si la semana ya existe no toca nada),
  para producción sin relanzar el seed completo.
- Esquema sin cambios de columnas: solo el comentario de
  `Decision.dias_abierta` documenta la resolución de la DUDA 2. Ninguna
  migración nueva.

### Tests y verificación

- Unitarios: `semana.test.ts` (zonas y cambios de hora),
  `decisiones.test.ts`, `proyectos.test.ts`, `diff.test.ts`.
- Integración contra la base (crean sus datos y los borran):
  `web/tests/proyectos.test.ts` — anillo con los datos del seed (1/3 y
  1/2), cuarto proyecto en pausa con aviso, rechazo al activar con cupo
  lleno, archivado tras filtro, versionado por hash (formato no crea
  versión), aviso de derivación por hash (volver al contenido antiguo lo
  apaga aunque el número de versión suba); `web/tests/decisiones.test.ts`
  — días calculados al leer ignorando la columna, cierre completo con
  congelado, doble cierre rechazado.
- `npm test`: 73/73 (24 del encargo 2 + 49 nuevos). `tsc --noEmit`
  limpio. `vitest` ahora corre los ficheros en secuencia
  (`fileParallelism: false`): comparten base.
- `web/scripts/comprobar-rutas.mjs` — ampliado: 23 comprobaciones, todas
  pasan (rutas nuevas, contenido, 404 de slug inexistente).
- `web/scripts/verificar-visual.mjs` — ampliado a las once rutas más el
  formulario de cierre de decisión abierto, a 375x812 y 1440x900: sin
  desbordamiento horizontal y consola sin errores.

## Qué decidí

- **DUDA 2 resuelta (dias_abierta).** Calculado al leer para abiertas;
  congelado en la columna al cerrar (días entre abierta_desde y
  cerrada_el). Una sola fuente de verdad por estado, sin job y sin
  migración. La columna en decisiones abiertas queda sin lectores.
- **DUDA 4 resuelta (5 activos con R2 en 3).** La validación aplica a
  transiciones nuevas; el estado del seed no se toca. Crear con cupo
  lleno → nace en pausa con aviso (H1.1 literal). Activar con cupo lleno
  → rechazo con "Ya tienes 3 proyectos activos. Pausa uno antes de
  activar otro."
- **La opción del cierre tiene que ser una de las consideradas** (radios,
  no campo libre). Lectura literal de "registrando la opción elegida".
- **Guardar el brief sin cambio de hash no crea versión** y avisa "sin
  cambios": el criterio del hash normalizado manda sobre la lectura
  ingenua de "cada guardado, una versión".
- **El aviso de derivación compara hashes contra los intents activos**
  (la versión más reciente de la que derivaron): volver al contenido
  anterior o retocar formato apaga el aviso aunque el número de versión
  suba. Botón presente y deshabilitado, con nota de que llega en el 6.
- **Límite R2 y umbral R6 leídos del playbook**, con la regla activa como
  interruptor. Anticipa H5.1 sin construir su pantalla.
- **Anillo con turbulencia de baja frecuencia** (0.022/scale 5): la alta
  frecuencia desintegraba el trazo en grano. Semilla derivada del slug:
  cada anillo tiembla distinto.
- **Seed del plan semanal mínimo aprobado por el usuario**, y su versión
  idempotente en `sembrar-semana.ts` para no relanzar el seed destructivo
  en producción.
- **Editar no cambia el slug** (URLs y engine dependen de él).
- **Desarchivar lleva a pausa**, nunca directo a activo: el cupo se
  valida al activar.

## Qué quedó fuera

- Alta y edición de decisiones desde la interfaz, vista de cerradas y
  estado `caducada` (no pedidos; DUDAS 15).
- Derivación real de intents (encargo 6). Sin intents en el seed, el
  aviso solo se ve en tests.
- Tareas, WIP, captura y sesiones (encargo 4); las cinco tareas del seed
  son datos, sin máquina de estados ni TaskEvents (DUDAS 20).
- Rituales y pantalla Hoy con las decisiones de más de 21 días
  (encargos 5 y 7). El umbral ya se ve en ámbar en el listado.
- Notas de proyecto (H1.5, no entra en el encargo 3), render markdown
  del brief (se muestra preformateado, DUDAS 22), formulario para
  Project.tipo y horas_objetivo (DUDAS 18), y todo lo de la lista
  prohibida.

## Qué falta verificar a mano

- **El anillo orbital en Safari y en pantalla de alta densidad**: el
  temblor (feTurbulence 0.03, scale 3, la variante contenida que eligió
  el usuario entre cuatro) está calibrado en Chromium. Se ajusta en
  `anillo-orbital.tsx`.
- **El flujo completo de cierre de una decisión en producción** con tu
  sesión: elegir opción, escribir motivo, ver el aviso "Decisión
  cerrada" y comprobar que desaparece del listado.
- **Las fechas `abierta_desde` del seed siguen siendo plausibles, no
  reales** (DUDAS 3): con el umbral de 21 días, hoy 8 de las 17 salen en
  ámbar. Corrígelas si van a mentir.
- **Producción**: desplegado el web con este encargo y sembrada la
  semana en curso con `sembrar-semana.ts` (no destructivo; tus datos no
  se tocan). Si cerraste decisiones o creaste datos en producción antes
  de este despliegue, revisa que sigan como esperas.

## Verificación criterio a criterio

| Criterio | Cumple | Nota |
|---|---|---|
| H1.1 crear con nombre y objetivo → aparece activo con color de paleta asignado solo | Sí | Test de integración; sexto color malva con los cinco del seed en uso |
| H1.1 con 3 activos, crear → nace `pausado` y se avisa (no error) | Sí | Validado en servidor dentro de transacción; banner en la lista |
| H1.1 cliente opcional; objetivo obligatorio de hasta 280 | Sí | Validación en servidor con mensaje que dice cuántos lleva |
| H1.2 markdown con las seis secciones fijas | Sí | Editor con plantilla; parseo reutiliza `brief.ts` (tolera nivel y ausencia) |
| H1.2 guardar → versión nueva con marca de tiempo y hash | Sí | Solo si el hash normalizado cambia; sin cambios, aviso y sin versión |
| H1.2 aviso de brief cambiado con botón de regenerar | Sí | Comparación por hash contra intents activos, no por versión; botón deshabilitado hasta el encargo 6 (DUDAS 17) |
| H1.2 historial y comparación de dos versiones cualesquiera | Sí | Selects a/b en URL, diff de líneas coloreado |
| H1.3 pausado: fuera del brief diario, sin research, sin contar para WIP | Parcial | Esas superficies no existen aún (encargos 4-7); el estado y las consultas por estado quedan listos y el anillo en pausa va en gris 30% |
| H1.3 archivado: fuera de navegación, datos intactos, accesible por filtro | Sí | Filtro "Archivados (n)"; test de integración |
| H1.4 anillo proporcional a tareas de la semana completadas/totales | Sí | `cierreDelAnillo` de reglas-proyecto; 1/3 y 1/2 con el seed, testeado |
| H1.4 sin resultado comprometido → trazo abierto y discontinuo | Sí | También cuando hay resultado y 0 tareas de semana |
| Anillo con feTurbulence + feDisplacementMap, no círculo limpio | Sí | Semilla por proyecto; dibujado 600ms/80ms; reduced-motion lo apaga |
| Decision: listado de abiertas por proyecto con opciones, quién bloquea y días | Sí | Ordenado por días desc; ámbar sobre el umbral de R6 |
| Decision: cierre con opción y motivo → estado cerrada y cerrada_el | Sí | Servidor rechaza opción fuera de lista, motivo vacío y doble cierre |
| DUDA 2 decidida y documentada | Sí | Calculado al leer en abiertas, congelado al cerrar; DUDAS 2, tests |
| Límite y reglas de negocio en servidor, no solo en cliente | Sí | Server actions finas sobre el servicio; middleware cubre las actions |
| Test del criterio principal | Sí | 73/73 (49 nuevos entre unitarios e integración) |
| Sin errores en consola | Sí | Playwright en 22 páginas más el formulario de cierre |
| Correcto a 375px | Sí | Once rutas a 375x812 sin desbordamiento, con capturas |
| Español de España, sin exclamaciones ni emojis | Sí | Interfaz y mensajes de error |
| Datos de ejemplo en el seed | Sí | Plan semanal con 2 resultados y 5 tareas; nada se ve vacío |
