# DUDAS

Contradicciones, ambigüedades y decisiones que merecen revisión. Nada de
esto se ha implementado más allá de lo que se indica.

## Del encargo 2 (estado tras el encargo 3)

1. **Cinco ramas frente a "sin lógica de negocio".** El encargo 2 dice
   "sin lógica de negocio todavía"; la adenda 05 dice "implementa las
   cinco ramas ahora" en la lógica de validación y métricas, que no
   existen aún. Resuelto con la opción conservadora: las cinco ramas son
   funciones puras en `web/src/lib/reglas-proyecto.ts`, con tests, sin
   cablear a ninguna validación. **Actualización del encargo 3:** el
   límite de activos consume `cuentaParaLimiteDeActivos` y el anillo
   consume `cierreDelAnillo`. Los encargos 4 y 5 deben seguir consumiendo
   este módulo.

2. **Decision.dias_abierta** — **resuelta en el encargo 3.** Mientras la
   decisión está abierta, los días se calculan al leer desde
   `abierta_desde` y la columna no se consulta; al cerrarla, el valor se
   congela en la columna (días entre `abierta_desde` y `cerrada_el`) como
   registro histórico. Una sola fuente de verdad por estado y sin job de
   recálculo. El valor que el seed escribe en decisiones abiertas queda
   como redundante e inofensivo: ningún código lo lee.

3. **Fechas de apertura de las diecisiete decisiones.** Los documentos no
   dan fechas; el seed usa fechas plausibles entre mayo y agosto de 2026.
   Con el umbral de 21 días de R6, la mayoría aparece hoy como bloqueada
   hace semanas (ya visible en el listado de decisiones del encargo 3,
   en ámbar). Si eso no refleja la realidad, corrige `abierta_desde` en
   `web/prisma/seed.ts`.

4. **Cinco proyectos activos con R2 en 3** — **resuelta en el encargo 3.**
   La validación del límite aplica solo a transiciones nuevas (crear y
   activar); el estado inicial del seed no se toca porque los documentos
   lo declaran así. Crear un proyecto con el cupo lleno lo deja en pausa
   con aviso; activar uno con el cupo lleno se rechaza con aviso. Para
   volver a estar dentro de R2 hay que pausar dos proyectos a mano o
   esperar al ritual del encargo 5 (su paso 2 pausa el resto).

5. **Categorías de las reglas sin asignar en ningún documento.**
   Asignadas: R1 foco, R2 foco, R3 ejecución, R4 captura, R5 revisión,
   R6 ejecución.

6. **validacion_dura sin especificar por regla.** Dura en R1, R2 y R3
   (el brief maestro las describe como impedimento técnico); blanda en
   R4, R5 y R6 (avisos y métricas). R6 guarda su umbral en
   `parametros.dias_umbral = 21`.

7. **Alcance del seed.** El encargo 2 pide proyectos, briefs y playbook;
   el usuario añadió decisiones e hitos. **Actualización del encargo 3:**
   se añade, a petición del usuario, un plan semanal mínimo de la semana
   en curso con los dos resultados comprometidos que declara la adenda 04
   (Yajoma y Cribo) y cinco tareas de semana (dos hechas), para que el
   anillo orbital tenga base de cálculo. El seed rico de H8.2 (30 tareas,
   sesiones, retro, hallazgos) llega con los encargos 4 a 7.

8. **"Capturar" en la barra móvil** — **resuelta en el encargo 4.** El
   botón deja de apuntar a /tareas y abre el mismo campo de captura que
   la tecla c, desde cualquier pantalla.

9. **Prisma fijado a 6.x y TypeScript a 5.x.** Prisma 7 elimina `url` en
   el datasource y cambia el flujo de configuración a `prisma.config.ts`
   con adapters; TypeScript 7 es la reescritura en Go y Next 15 no la
   soporta oficialmente. Subir de versión es un encargo propio, no un
   efecto colateral.

10. **No hay cierre de sesión.** H8.1 no lo pide: usuario único y sesión
    de 30 días. Si se quiere, es un botón que borra la cookie.

11. **Una retrospectiva por semana.** H4.2 lo implica; el esquema lo fija
    con `Retro.weekly_plan_id` único.

12. **user_id fijo** con valor `vluna` en todas las tablas; la UI no lo
    expone.

13. **El engine declara langgraph sin importarlo.** El stack lo fija y
    así queda anclado en el lockfile; el pipeline llega con el encargo 6.

14. **Railway con token de proyecto.** Decisión del usuario para aislar
    sus proyectos en producción. Documentado en la skill de despliegue.

## Del encargo 3

15. **Decisiones: solo listado de abiertas y cierre.** El encargo pide el
    listado por proyecto y el cierre con opción y motivo. No hay alta ni
    edición de decisiones desde la interfaz, ni vista de cerradas, ni
    gestión del estado `caducada` (el enum existe y nada lo usa aún). Si
    hace falta, es una historia nueva.

16. **La opción elegida tiene que ser una de las consideradas.** Es la
    lectura literal de "registrando la opción elegida". Si al cerrar de
    verdad gana una opción que no estaba en la lista, hoy no se puede: se
    documenta como límite. Alternativa descartada: campo libre.

17. **Botón "Regenerar intents" deshabilitado.** H1.2 pide el aviso "El
    brief cambió desde la última derivación de intents" con un botón para
    regenerarlos. El aviso funciona (compara hashes contra los intents
    activos); el botón existe y explica que la derivación llega con el
    motor del encargo 6. Sin intents en el seed, el aviso no aparece en
    la interfaz: lo cubren los tests de integración.

18. **Project.tipo y horas_objetivo sin interfaz.** Ninguna historia del
    encargo los pide en formularios. Los proyectos nuevos nacen como
    `entrega`. La lógica de continuo (anillo por horas, límite que no
    consume plaza) está implementada en el servicio por venir de la
    adenda 05, pero no hay forma de crear un proyecto continuo desde la
    interfaz.

19. **El límite de R2 se lee del playbook.** `parametros.limite` de la
    regla R2 activa, con 3 por defecto; si la regla está desactivada no
    hay validación. Anticipa el interruptor de H5.1 sin construir su
    interfaz. Lo mismo con el umbral de 21 días de R6 para destacar
    decisiones en ámbar.

20. **Tareas del seed sin eventos de transición** — **resuelta en el
    encargo 4.** El seed retro-genera para cada tarea un rastro plausible
    de eventos (creación en inbox y transiciones hasta su estado actual,
    repartidas entre la captura y la última actividad): el historial del
    detalle no nace vacío. Son fechas plausibles, no reales.

21. **`WeeklyPlan.proyectos_activos` guarda slugs** (`["yajoma","cribo"]`),
    los dos proyectos con resultado comprometido declarado en la adenda
    04. El ritual del encargo 5 fijará el formato definitivo y la
    coherencia con R2 (hoy hay cinco activos y un plan con dos).

22. **El brief se muestra como texto preformateado,** no como markdown
    renderizado. Ningún criterio pide fidelidad de render y el contenido
    son listas y párrafos que se leen bien tal cual. Si se quiere render
    completo, es una mejora aparte.

23. **La comparación de versiones usa un diff propio** (subsecuencia
    común más larga, por líneas) en `web/src/lib/diff.ts`, para no añadir
    dependencias. Suficiente para briefs; no calcula diffs dentro de una
    línea.

24. **Guardar el brief sin cambios reales no crea versión** (el hash
    normalizado coincide) y se avisa "sin cambios". H1.2 dice "cuando
    guardo, se crea una versión nueva": se interpreta que guardar lo
    mismo no debe duplicar versiones, coherente con el criterio del hash
    del encargo.

25. **Editar un proyecto no cambia su slug.** Las URLs y el engine
    dependen de él; renombrar cambia el nombre visible y conserva el
    slug.

## Del encargo 4

26. **Hecha también desde semana, no solo desde en_curso.** H2.2 solo
    restringe la entrada a en_curso ("solo desde semana"); la casilla de
    la fila permite cerrar una tarea de semana sin pasar por en_curso,
    porque exigir el paso intermedio obligaría a atravesar el límite de
    WIP para marcar hecha una tarea de diez minutos. Inbox y backlog no
    tienen casilla: una tarea sin triar no se cierra desde la lista.

27. **La última actividad conocida de una sesión es el latido del
    cronómetro.** Mientras la pestaña está abierta, el cronómetro avisa
    al servidor cada 5 minutos y eso refresca updated_at. La detección de
    huérfanas es perezosa (al leer la sesión activa o al arrancar otra),
    sin job programado: pasadas 4 horas desde el último latido, la sesión
    queda abandonada con la duración contada hasta ese latido. Margen de
    error de hasta 5 minutos en la duración registrada, asumido.

28. **El arranque de sesión pide proyecto.** WorkSession.project_id es
    obligatorio en el esquema del encargo 2, así que no hay sesión sin
    proyecto. La tarea vinculable es opcional y se filtra a las tareas en
    semana o en curso del proyecto elegido. Un proyecto archivado no
    admite sesiones; uno en pausa sí (H1.3 no lo prohíbe).

29. **La arroba de la captura casa por prefijo y sin desplegable.**
    @yajoma o @Flujo asignan proyecto por prefijo de nombre o slug, sin
    distinguir mayúsculas ni acentos, entre proyectos no archivados. Si
    el token no casa con ninguno, queda como texto en el título: el
    proyecto nunca es obligatorio (H2.1 literal). Sin autocompletado: con
    cinco proyectos no hace falta.

30. **Arranque de sesión en móvil.** La tecla s no existe en pantalla
    táctil y el lateral está oculto. El botón Empezar sesión vive en la
    pantalla Hoy (anticipa la sección 2 de H7.1 sin construir la
    pantalla). En escritorio están el lateral y la tecla s.

31. **Lo que H2.4 y H2.5 dicen del brief diario queda para el encargo
    7.** El siguiente paso ya se ve en la fila y el detalle; las
    bloqueadas guardan motivo y fecha de actualización. La pantalla Hoy
    completa y el destacado de bloqueadas de más de 3 días llegan con
    H7.1. **Actualización del encargo suelto de la pantalla Hoy:**
    avance parcial. El siguiente paso y el bloqueo ya se ven en Hoy,
    porque la sección de tareas en curso reutiliza la fila de tarea; el
    destacado específico de bloqueadas de más de 3 días y los avisos de
    la sección 6 de H7.1 siguen pendientes del encargo 7.

32. **Las actions de formulario devuelven lo escrito cuando fallan.**
    React resetea el formulario tras cada envío: sin ese eco, un fallo de
    validación (R3 sin siguiente paso) borraba la nota a medias. Patrón a
    mantener en formularios nuevos con validación en servidor.

33. **El avance de la nota de cierre es obligatorio siempre.** H3.2 marca
    como opcional solo el bloqueo; R3 gobierna únicamente el siguiente
    paso. Desactivar R3 permite cerrar sin siguiente paso, pero nunca sin
    contar qué se avanzó.

34. **El bloqueo es una bandera, no un estado.** Cualquier tarea no
    terminal puede bloquearse con motivo obligatorio y tarea bloqueante
    opcional. Una en_curso bloqueada libera su plaza de WIP al instante y
    la recupera al desbloquearse, sin pasar por la máquina de estados.

35. **El filtro de vencimiento tiene tres valores:** todas, vencidas y
    próximos 7 días. H2.6 no concreta el corte; siete días casa con el
    horizonte semanal del método.

36. **Producción no se resiembra.** El seed es destructivo y las 36
    tareas, 99 eventos y 11 sesiones de ejemplo son de desarrollo. El
    despliegue del encargo 4 solo actualiza el código; los datos que haya
    en producción se conservan tal cual.

## Del encargo suelto de la pantalla Hoy (adelanto parcial de H7.1)

37. **La sección de tareas muestra las en curso a secas.** El encargo
    pide "tareas en curso, las bloqueadas marcadas": no se completa
    hasta tres con las de semana de mayor prioridad, que es la lógica de
    "las tres cosas de hoy" de la H7.1 completa y llega con el encargo
    7. La cabecera del documento 01 (fecha y titular "Tres cosas hoy")
    se mantiene tal cual aunque hoy la sección liste las en curso.

38. **H1.3 aplicada al brief diario entero.** Un proyecto en pausa "no
    aparece en el brief diario": sus tareas en curso, sus sesiones de
    ayer y sus decisiones abiertas quedan fuera de las tres consultas de
    la pantalla Hoy (los archivados también). Las tareas sin proyecto sí
    entran.

39. **Notas de cierre de ayer = sesiones terminadas en el día civil de
    ayer en Europe/Madrid y con nota escrita.** El corte de medianoche
    es exclusivo (una sesión cerrada a las 00:00 de hoy ya no es de
    ayer) y los cambios de hora quedan absorbidos (ayer puede durar 23 o
    25 horas; hay tests de ambos bordes). Una abandonada cuenta si
    terminó ayer y su nota ya está escrita, marcada como "Quedó
    abandonada". El seed añade una sesión anclada al día anterior a la
    siembra para que la sección nunca nazca vacía.

40. **R6 desactivada hace desaparecer la sección de decisiones entera,**
    coherente con que desactivar una regla desactiva su validación (como
    R1, R2 y R3). El umbral se lee de parametros.dias_umbral de la
    última versión del playbook en cada petición (21 por defecto) y es
    estricto: "más de 21 días" excluye la que lleva exactamente 21. El
    cierre de decisiones no se duplica en Hoy: cada título enlaza al
    detalle del proyecto, donde ya vive.

41. **Sin anillos orbitales en la cabecera del brief diario.** El
    documento 01 los sitúa ahí, pero codifican el avance del resultado
    comprometido y este encargo pide omitir esa parte. Llegan con la
    pantalla Hoy completa del encargo 7.
