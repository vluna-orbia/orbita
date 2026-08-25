# DUDAS — Encargo 2

Contradicciones, ambigüedades y decisiones que merecen revisión. Nada de
esto se ha implementado más allá de lo que se indica.

1. **Cinco ramas frente a "sin lógica de negocio".** El encargo 2 dice
   "sin lógica de negocio todavía"; la adenda 05 dice "implementa las
   cinco ramas ahora" en la lógica de validación y métricas, que no
   existen aún. Resuelto con la opción conservadora: las cinco ramas son
   funciones puras en `web/src/lib/reglas-proyecto.ts`, con tests, sin
   cablear a ninguna validación. Los encargos 3 a 5 deben consumir ese
   módulo en lugar de reescribir los condicionales.

2. **Decision.dias_abierta es un dato derivado almacenado.** El documento
   04 lo lista como campo, así que la columna existe y el seed la calcula
   a fecha de carga. Nada la recalcula después. El encargo que construya
   la lógica de decisiones tiene que decidir si se deriva al leer o se
   recalcula con un job, y retirar una de las dos fuentes de verdad.

3. **Fechas de apertura de las diecisiete decisiones.** Los documentos no
   dan fechas; el seed usa fechas plausibles entre mayo y agosto de 2026.
   Con el umbral de 21 días de R6, la mayoría aparecería hoy como
   bloqueada hace semanas. Si eso no refleja la realidad, corrige
   `abierta_desde` en `web/prisma/seed.ts` antes del encargo de la
   pantalla Hoy.

4. **Cinco proyectos activos con R2 en 3.** Los documentos declaran los
   cinco en `activo` y el propio 04 reconoce el desbordamiento. El seed
   los carga tal cual porque en este encargo no hay validación. El
   encargo 3 (límite de activos en servidor) chocará con este estado
   inicial: habrá que decidir si el seed pausa alguno o si la validación
   solo aplica a cambios nuevos.

5. **Categorías de las reglas sin asignar en ningún documento.**
   Asignadas: R1 foco, R2 foco, R3 ejecución, R4 captura, R5 revisión,
   R6 ejecución.

6. **validacion_dura sin especificar por regla.** Dura en R1, R2 y R3
   (el brief maestro las describe como impedimento técnico); blanda en
   R4, R5 y R6 (avisos y métricas). R6 guarda su umbral en
   `parametros.dias_umbral = 21`.

7. **Alcance del seed.** El encargo 2 pide proyectos, briefs y playbook;
   el usuario añadió decisiones e hitos. No se cargan tareas, sesiones,
   planificaciones, resultados comprometidos, intents ni hallazgos (los
   resultados comprometidos que el 04 declara para Yajoma y Cribo
   pertenecen a una semana concreta y entran con los rituales). H8.2
   describe un seed más rico: se completará en los encargos que
   construyan esas entidades.

8. **"Capturar" en la barra móvil** apunta a /tareas hasta que exista la
   captura con la tecla c (encargo 4).

9. **Prisma fijado a 6.x y TypeScript a 5.x.** Prisma 7 elimina `url` en
   el datasource y cambia el flujo de configuración a `prisma.config.ts`
   con adapters; TypeScript 7 es la reescritura en Go y Next 15 no la
   soporta oficialmente. El stack del brief no fija versión, así que se
   usan las líneas estables del flujo clásico. Subir de versión es un
   encargo propio, no un efecto colateral.

10. **No hay cierre de sesión.** H8.1 no lo pide: usuario único y sesión
    de 30 días. Si se quiere, es un botón que borra la cookie.

11. **Una retrospectiva por semana.** H4.2 lo implica; el esquema lo fija
    con `Retro.weekly_plan_id` único.

12. **user_id fijo** con valor `vluna` en todas las tablas; la UI no lo
    expone.

13. **El engine declara langgraph sin importarlo.** El stack lo fija y
    así queda anclado en el lockfile; el pipeline llega con el encargo 6.

14. **Railway con token de proyecto.** Decisión del usuario para aislar
    sus proyectos en producción. `railway add` debería poder crear la
    base y los servicios dentro del proyecto del token; si Railway lo
    rechaza por permisos, esos recursos se crean a mano en el panel
    (documentado en la skill de despliegue).
