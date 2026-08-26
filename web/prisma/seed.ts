// Órbita — seed del encargo 2.
// Carga los cinco proyectos reales con sus briefs literales de los
// documentos 04 y 05, el playbook base con las reglas R1 a R6, las
// diecisiete decisiones abiertas de Yajoma y Cribo, y los tres hitos
// del proyecto Flujo de specs.
//
// El seed es destructivo: borra y recarga. Es una base de un solo
// usuario y este comando existe para que la app nunca se vea vacía en
// desarrollo.

import { PrismaClient, Prisma } from "@prisma/client";
import { hashContenido, parsearSecciones } from "../src/lib/brief";
import { inicioDeSemana, instanteInicioDeSemana, rangoDeAyer } from "../src/lib/semana";
import { metricasDeLaSemana } from "../src/lib/servicio-rituales";

const prisma = new PrismaClient();

// Usuario único. Las tablas llevan user_id desde el día uno para no
// bloquear una futura versión multiusuario; la UI no lo expone.
const USER_ID = "vluna";

function diasDesde(fecha: Date, hasta: Date): number {
  return Math.max(0, Math.floor((hasta.getTime() - fecha.getTime()) / 86_400_000));
}

// ---------- Briefs literales (documentos 04 y 05) ----------

const BRIEF_YAJOMA = String.raw`## Contexto
Panadería Yajoma es un grupo gallego de unos 50 empleados: obrador central en
Sabarís (Baiona), tres tiendas y una cafetería, repartidos en tres sociedades
(Yajoma Sabarís, El Buen Gusto y Panadería Yajoma Vigo). Orbia entra como capa
de automatización, IA e inteligencia de negocio por encima de la implantación
de Odoo que ejecuta Solvos. Encargo por horas: 700 €/mes, 20 h a 35 €/h, con
presupuesto formal P-2026-0002 de 3.950 € + IVA vinculado a una subvención. Un
organismo verifica la implantación de Odoo para concederla, y eso ordena las
prioridades. El frente principal es la app de pedidos B2B, que sustituye los
pedidos por WhatsApp de cafeterías, restaurantes y hoteles y genera hojas de
producción por departamento. Nació como prototipo de Google AI Studio y se
migró a repositorio propio en junio de 2026, rehaciendo autenticación y datos
sobre Postgres. Hoy está en desarrollo avanzado: catálogo espejo de Odoo
validado en development, producción desplegada pero todavía apuntando al Odoo
de test.

## Objetivos
Del cliente: eliminar el pedido manual diario de Emilio, entre hora y media y
dos horas cada noche, con pérdidas confirmadas cuando falta; y obtener hojas de
producción por departamento. Éxito medible: los clientes piden en la app y la
hoja de producción sale sola. Segundo objetivo, justificar la implantación de
Odoo ante el organismo de la subvención, con implantación real, trazable y
documentada. A medio plazo, aliviar a Alba con los albaranes y poder ver merma
y rentabilidad por producto.

Propio: entregar un producto en producción con repositorio y documentación
legibles por terceros, facturar por horas y sostener la relación con Solvos
como fuente de referidos.

## Requerimientos
- Catálogo espejo desde Odoo con altas, cambios y bajas automáticas —
  [acordado], hecho (spec 014)
- Filtro del catálogo por mapa categoría Odoo → departamento, editable en
  admin; las categorías nuevas aparecen sin mapear — [acordado], spec 015 en
  propuesta
- Importar los 178 clientes de Odoo con ficha espejo y odooPartnerId —
  [acordado], spec 016 en propuesta
- Login por NIF en lugar de email, con el plugin username de better-auth —
  [acordado] 24/08/2026
- IVA desglosado en el total; precio igual al list_price de Odoo sin IVA —
  [acordado]
- Push de pedidos a Odoo como Sales Order en Yajoma Sabarís — [propuesto],
  spec 017
- Hojas de producción a partir de pedidos, no plan diario completo —
  [acordado]
- Expansión de pedidos recurrentes a pedidos con fecha — [acordado], sin
  implementar
- Sección de repartidor con listado de reparto, estados y ruta — [en discusión]
- Go-live: reapuntar producción al Odoo real, resincronizar, admin real,
  borrar usuarios de prueba — [acordado], pendiente
- Transcripción IA de albaranes y facturas con evolk, integrada en Odoo —
  [acordado], arranque previsto en septiembre
- WhatsApp Cloud API sobre n8n — [acordado], configurado; su papel tras la app
  queda [en discusión]
- Merma, configurador de catering, dashboard de rentabilidad, horarios de
  personal — [propuesto]

## Stack
React 19, TypeScript, Vite, Tailwind v4. Node/Express, Drizzle, PostgreSQL,
better-auth, jsPDF. Railway con dos entornos aislados y auto-deploy; también
n8n con primary, worker, Redis y Postgres. Odoo 19 Community vía JSON-RPC.
GitHub en vluna-orbia/yajoma-b2b, con specs y ADRs. Desarrollo con Claude Code
en VS Code. Proveedores: Railway, Solvos (Odoo y su hosting), Siscom (servidor
y equipos), evolk (transcripción), CAICONTA (contabilidad).

## Decisiones abiertas
- Departamento por defecto de BOLLERIA: Obrador o Pastelería. Bloquea Yajoma:
  falta criterio.
- Cinco pares de clientes con NIF duplicado: fusionarlos o dar acceso solo a
  uno. Bloquea Solvos (S-06). Con el NIF como usuario, un NIF repetido es un
  usuario repetido.
- Unidades de medida: dos artículos separados (B2B unidad, tienda kg) o una
  sola UoM. Hoy todo va en Units. Bloquea Yajoma, no urge.
- Aprobación de las specs 015 y 016, en estado propuesta. Bloquea revisión
  propia.
- Sección de reparto y cálculo de ruta: Google Maps limita a diez paradas. Se
  barajó lista ordenada con ruta punto a punto. Bloquea: falta spec y falta
  saber si entra en alcance.
- Estados bidireccionales entre app y Odoo: sin decidir.
- Multi-entidad: hoy los pedidos van a Sabarís. Falta definir si El Buen Gusto
  y Vigo entran. Bloquea la configuración de compañías de Solvos.
- Recetas: si existen y en qué formato. Bloquea sesión pendiente con Emilio y
  definición de Lucía.
- Reparto de responsabilidades entre evolk y Solvos en el flujo de albaranes.
  Bloquea llamada Carlos–Antonio sin cerrar.
- Papel del WhatsApp una vez viva la app: fallback con IA o retirada.

## Riesgos
- Las API keys de Odoo caducan sin aviso (S-14). Ya tumbaron el sync seis días
  en julio. Dependemos de que alguien regenere la clave.
- Cadena TLS incompleta en el servidor de Solvos (S-13). Se suple con un
  certificado versionado que caduca por su cuenta; el día que expire, la
  integración cae sola.
- Borrado automático de catálogo: Odoo manda y lo ausente se borra. En julio
  esto habría vaciado el catálogo entero al desaparecer una categoría.
  Mitigado con cortacircuitos, pero el patrón sigue.
- Producción apunta al Odoo de test y su espejo tiene odooId colgados.
  Cualquier uso real antes del go-live daría datos falsos.
- Odoo lo mueve Solvos, no nosotros: el calendario depende de una carga de
  datos que no controlamos.
- Solo 33 de 178 clientes tienen email y ninguno tiene portal. El alta de
  accesos será trabajo manual de administración.
- La subvención introduce un plazo externo. Si el organismo evalúa antes de
  tiempo, la documentación pesa más que la funcionalidad.
- Adopción de Emilio y de los clientes de hostelería. Si siguen escribiendo por
  WhatsApp, el ahorro no se materializa.
- Alcance abierto en contrato por horas. Con diez decisiones sin cerrar, el
  proyecto puede alargarse sin cierre percibido por el cliente.
- Cuenta personal de Facebook bloqueada para la verificación de identidad en
  Meta: cualquier acción sensible sobre WhatsApp depende de una persona.`;

const BRIEF_CRIBO = String.raw`## Contexto
Cribo es un agente de IA que clasifica y asigna la documentación entrante,
correo y adjuntos, en gestorías y despachos profesionales; genera tareas
priorizadas por técnico y escala a revisión humana los casos dudosos. Es marca
de producto independiente bajo Orbia Solutions. La contraparte es Tecsem,
gestoría de Vigo: el gerente confirmó la colaboración y su ingeniero de
sistemas se comprometió a construir APIs a medida sobre su ERP Ekon. El
proyecto se formalizó al preparar la candidatura a startTIC (Zona Franca de
Vigo, Cámara de Pontevedra, Gradiant), con incubación prevista del 10/09/2026
al 10/03/2027 y 80% de presencialidad en Vigo. Fase actual: pre-piloto. La
arquitectura está definida, el desarrollo para el dominio gestoría parte de
cero, y el frente activo es la web de Cribo, con copy final aprobado y maqueta
pendiente de revisión.

## Objetivos
Del cliente: reducir el tiempo dedicado al triaje manual del correo entrante y
dar orden y trazabilidad a la asignación de trabajo. El criterio concreto de
éxito con Tecsem no está pactado.

Propio: validar el piloto como puerta previa a la constitución de sociedad, la
financiación privada y la actividad comercial más amplia. Éxito: un piloto en
producción con métricas de validación. Las métricas todavía no están definidas.

## Requerimientos
- Agente de triaje: clasificación por cliente, tipo (AEAT/TGSS, laboral,
  contable-fiscal, consultas) y urgencia, con escalado humano — [acordado]
- Panel propio de asignación de trabajo como salida por defecto — [acordado]
- Buzón unificado por reenvío de correo en el entorno piloto — [acordado]
- Capa de integración MCP para correo, gestión documental y ERP — [acordado]
- Integración con Ekon vía las APIs de Tecsem, como implementación opcional a
  medida — [acordado]
- Web de Cribo: copy final cerrado, maqueta por fases, hero y entrada
  unificada primero — [acordado]
- OCR y extracción de datos estructurados fuera del alcance del MVP —
  [acordado]
- Ciberseguridad como requisito sustantivo, incluida mitigación de prompt
  injection vía correo externo — [propuesto]
- Registro de marca en clases 9 y 42 con agente de propiedad industrial —
  [propuesto]
- Becarios de FP de Montecastelo para desarrollo y etiquetado — [en discusión]
- Modelo de negocio en tres capas: setup, suscripción, expansión —
  [en discusión]

## Stack
Orquestación con LangGraph y LangChain. MCP como capa de integración. LLM open
source (Llama, Mistral, Qwen) sobre infraestructura dedicada o local. Ekon en
Tecsem; Odoo como experiencia previa de referencia. Hetzner identificado como
mejor relación coste/valor para GPU en la UE durante el piloto, IONOS evaluado.
El sistema previo del sector financiero, Avior, corre sobre Odoo, n8n y LLM en
nube; n8n queda descartado para Cribo. Claude Design para la maqueta web,
TMview para marcas, starttic.com para la candidatura.

## Decisiones abiertas
- Co-fundador de marketing: incorporarlo o seguir en solitario. Bloquea: no
  entró en startTIC con proyecto propio y su implicación sigue sin resolverse.
- Presupuesto: conviven 35.000–45.000 € en la candidatura y 45.000–55.000 € en
  el informe inicial. Bloquea: seguro de responsabilidad civil con ciberriesgo
  y soporte de ciberseguridad sin cotizar.
- Infraestructura del piloto: GPU alquilada en la UE o máquina física en la
  gestoría. Bloquea: coste mensual y que el programa no garantiza servidores
  GPU a las incubadas.
- Nombre de Tecsem en la web: nombrarlos o mantener "gestoría de Vigo".
  Bloquea: falta permiso por escrito.
- Dominio: cribo.es o cribo.app. Bloquea: comprobar disponibilidad.
- Registro de marca. Bloquea: contratar agente de propiedad industrial y
  redactar el listado de clases 9 y 42 a distancia de los vecinos crib*.
- Becarios de Montecastelo. Bloquea: sin confirmar el centro.

## Riesgos
- Promotor único: concentra ejecución técnica y comercial en una persona. Es la
  principal debilidad estructural declarada.
- Piloto único: toda la validación depende de Tecsem. Si se cae, no hay segunda
  referencia.
- Prompt injection vía contenido de correo recibido del exterior. Riesgo
  técnico real en un agente que lee correo no confiable.
- Dependencia de un tercero para la integración: las APIs de Ekon las construye
  personal de Tecsem, fuera de nuestro control de calendario.
- Marca: vecinos próximos en la raíz crib* (criboos, CRIB, CRIBS). Riesgo
  práctico bajo, pero presentarse sin agente lo eleva.
- Web en presente de un producto no construido. Mitigado con el encuadre de
  piloto con plazas limitadas, pero sigue siendo expectativa que gestionar.
- Carga de la incubación: 80% de presencialidad en Vigo durante seis meses
  compite con la actividad facturable de Orbia.`;

const BRIEF_ORBIA = String.raw`## Contexto
Orbia Solutions es la consultoría de automatización inteligente e IA para pymes
que opera como autónomo desde Baiona/Vigo. Es la entidad que factura y la marca
paraguas bajo la que viven los proyectos de cliente y Cribo como producto
propio. Hoy la actividad facturable se concentra en Yajoma (700 €/mes) y la
relación con Solvos funciona como canal de referidos sin comisión, a cambio de
colaboración. El resto del tiempo va a Cribo y a la preparación de startTIC.

## Objetivos
Sostener la facturación mientras Cribo se valida, sin que la incubación se
coma la actividad de cliente. Convertir la relación con Solvos en un canal
estable de referidos. Definir una oferta empaquetada que no dependa de horas.

## Requerimientos
- Mantener la relación con Solvos activa y documentada — [acordado]
- Presencia web de Orbia — [acordado], en marcha
- Oferta de servicios empaquetada con precio, en lugar de por horas —
  [propuesto]
- Cartera de al menos un segundo cliente facturable antes de que arranque la
  incubación — [propuesto]

## Stack
Claude Code, Railway, n8n, Odoo. Contabilidad con CAICONTA.

## Decisiones abiertas
- Modelo de contratación: seguir por horas o pasar a proyecto cerrado. Bloquea:
  falta de datos propios sobre horas reales por tipo de encargo. Órbita debería
  resolver esto en unos meses.
- Constitución de sociedad: ligada a la validación del piloto de Cribo.
- Reparto de dedicación entre actividad facturable y producto propio durante la
  incubación. Bloquea: no hay medición.

## Riesgos
- Concentración de ingresos en un solo cliente.
- La incubación de Cribo, con 80% de presencialidad durante seis meses,
  compite directamente con la capacidad de facturar.
- Contratación por horas con alcance abierto: dificulta prever ingresos y
  cerrar proyectos.`;

const BRIEF_ORBITA = String.raw`## Contexto
Órbita es la herramienta que estás leyendo: sistema operativo personal de
trabajo, de un solo usuario, construido para ordenar proyectos, sostener la
ejecución y recibir investigación externa conectada a los requerimientos de
cada proyecto. Se construye con un sistema de agentes a partir de la
documentación en 00, 01, 02 y 03.

## Objetivos
Que las diecisiete decisiones abiertas repartidas entre Yajoma y Cribo estén
visibles en un solo sitio, con quién las bloquea. Que ninguna semana pase sin
un resultado comprometido por proyecto. Que el radar produzca al menos un
hallazgo convertido en tarea por semana. Éxito: a las cuatro semanas, sigues
usándola sin obligarte.

## Requerimientos
Los de la lista de alcance v1 del brief maestro.

## Stack
Next.js 15, Prisma, PostgreSQL, FastAPI, LangGraph, Railway. API key de
Anthropic dedicada, aislada de la suscripción interactiva.

## Decisiones abiertas
- Si se construye entera antes del 10/09 o se recorta a un núcleo sin radar.
- Si el anillo orbital merece el coste de implementación.

## Riesgos
- Es el cuarto proyecto activo cuando la regla propia dice tres.
- Construir una herramienta de productividad es la forma más elegante de no
  trabajar en lo que factura.
- Si el radar produce ruido las dos primeras semanas, se abandona.`;

const BRIEF_FLUJO_SPECS = String.raw`## Contexto
Orbia trabaja hoy con un flujo de specs que existe solo dentro del repositorio
de Yajoma: specs numeradas con criterios de aceptación, validación en
development antes de promocionar a main, y ADRs para las decisiones. Funciona,
pero no está escrito en ninguna parte, no se aplica a Cribo ni a la gestión del
propio negocio, y no sobrevive a un cambio de proyecto. El repaso del máster de
spec-driven development es el material de entrada para formalizarlo. El momento
es ahora porque Cribo arranca el desarrollo del dominio gestoría desde cero el
10/09/2026: es la única ocasión próxima de estrenar el flujo en un proyecto
virgen en lugar de retro-encajarlo en uno en marcha.

## Objetivos
Tener un flujo de specs escrito, propio y aplicado a los tres proyectos de
Orbia. Éxito: las primeras specs de Cribo se escriben con él sin consultar el
máster, y una decisión de negocio de Orbia pasa por el mismo flujo que una
decisión técnica. Objetivo secundario: que cada bloque de estudio produzca o una
regla candidata para el Playbook o un ajuste concreto al flujo de Yajoma. Si un
bloque no produce ninguna de las dos cosas, fue lectura, no trabajo.

## Requerimientos
- Plantilla de spec con secciones fijas y criterios de aceptación verificables
  — [propuesto], hito 1
- Definición de los estados de una spec y de qué se necesita para pasar de uno
  a otro — [propuesto], hito 1
- Plantilla de ADR alineada con la que ya se usa en Yajoma — [propuesto],
  hito 1
- Las cinco primeras specs de Cribo escritas con el flujo — [propuesto],
  hito 2
- Adaptación del flujo a decisiones que no son de software, para Orbia y para
  la R6 del Playbook — [propuesto], hito 3
- Retro-encaje de las specs 015, 016 y 017 de Yajoma al formato final —
  [propuesto], hito 3

## Stack
Material del máster de spec-driven development. Markdown versionado en el
repositorio de cada proyecto. Claude Code como consumidor final de las specs:
el formato tiene que ser legible por un agente, no solo por una persona.

## Decisiones abiertas
- Dónde vive el flujo: repositorio propio, o duplicado en cada proyecto.
  Bloquea: falta saber cuánto va a divergir entre software y negocio.
- Si las specs de Cribo se escriben antes o después de cerrar la arquitectura
  del piloto.
- Qué nivel de detalle aguanta un proyecto no técnico sin que el flujo se
  vuelva burocracia.

## Riesgos
- Que el repaso se convierta en consumo de material sin producir el flujo.
  Mitigación: cada bloque termina con un artefacto o no cuenta.
- Que el hito 2 se solape con el arranque de la incubación y se coma tiempo de
  Cribo en lugar de ahorrarlo.
- Que el flujo quede sobredimensionado para proyectos pequeños y se abandone.`;

// ---------- Datos ----------

const PROYECTOS = [
  {
    slug: "yajoma",
    nombre: "Yajoma",
    cliente: "Panadería Yajoma",
    objetivo:
      "Que los clientes pidan en la app y la hoja de producción salga sola, con la implantación de Odoo justificada ante el organismo de la subvención.",
    color_acento: "#B99C4A",
    orden: 1,
    brief: BRIEF_YAJOMA,
  },
  {
    slug: "cribo",
    nombre: "Cribo",
    cliente: null,
    objetivo:
      "Validar el piloto con Tecsem como puerta a la constitución de sociedad: un piloto en producción con métricas de validación.",
    color_acento: "#5B6B73",
    orden: 2,
    brief: BRIEF_CRIBO,
  },
  {
    slug: "orbia",
    nombre: "Orbia",
    cliente: null,
    objetivo:
      "Sostener la facturación mientras Cribo se valida y convertir la relación con Solvos en un canal estable de referidos.",
    color_acento: "#C97B5A",
    orden: 3,
    brief: BRIEF_ORBIA,
  },
  {
    slug: "orbita",
    nombre: "Órbita",
    cliente: null,
    objetivo:
      "Ver las diecisiete decisiones abiertas de Yajoma y Cribo en un solo sitio y que ninguna semana pase sin resultado comprometido por proyecto.",
    color_acento: "#3D3A54",
    orden: 4,
    brief: BRIEF_ORBITA,
  },
  {
    slug: "flujo-specs",
    nombre: "Flujo de specs",
    cliente: null,
    objetivo:
      "Tener un flujo de specs escrito, propio y aplicado a los tres proyectos de Orbia: las specs de Cribo se escriben con él sin consultar el máster.",
    color_acento: "#5F7A5B",
    orden: 5,
    brief: BRIEF_FLUJO_SPECS,
  },
] as const;

// Reglas del playbook. R1 a R5 con el texto literal del brief maestro;
// R6 con el texto literal de la adenda 04.
const REGLAS = [
  {
    clave: "R1",
    texto: "Máximo 3 tareas en curso a la vez, contando todos los proyectos.",
    categoria: "foco",
    validacion_dura: true,
    parametros: { limite: 3 },
  },
  {
    clave: "R2",
    texto: "Máximo 3 proyectos activos por semana.",
    categoria: "foco",
    validacion_dura: true,
    parametros: { limite: 3 },
  },
  {
    clave: "R3",
    texto: "Toda sesión de trabajo se cierra escribiendo el siguiente paso.",
    categoria: "ejecución",
    validacion_dura: true,
    parametros: null,
  },
  {
    clave: "R4",
    texto: "Todo lo que entra va al Inbox y no se procesa hasta el ritual semanal.",
    categoria: "captura",
    validacion_dura: false,
    parametros: null,
  },
  {
    clave: "R5",
    texto: "Cada proyecto activo tiene un único resultado comprometido para la semana.",
    categoria: "revisión",
    validacion_dura: false,
    parametros: null,
  },
  {
    clave: "R6",
    texto:
      "Toda decisión con más de una opción viable se registra antes de ejecutarla, con las opciones consideradas y el motivo de la elegida.",
    categoria: "ejecución",
    validacion_dura: false,
    // Validación asociada (adenda 04): una decisión abierta que lleve más
    // de 21 días sin resolverse aparece en el brief diario. Métrica de
    // adherencia: decisiones cerradas con motivo registrado sobre
    // decisiones cerradas.
    parametros: { dias_umbral: 21 },
  },
] as const;

// Las diecisiete decisiones abiertas de Yajoma (10) y Cribo (7),
// transcritas de las secciones "Decisiones abiertas" de sus briefs.
// Las fechas de apertura son plausibles, no reales: los documentos no
// las dan (ver DUDAS.md).
const DECISIONES: {
  proyecto: "yajoma" | "cribo";
  titulo: string;
  opciones: string[];
  bloqueado_por: string | null;
  abierta_desde: string;
}[] = [
  {
    proyecto: "yajoma",
    titulo: "Departamento por defecto de BOLLERIA",
    opciones: ["Obrador", "Pastelería"],
    bloqueado_por: "Yajoma: falta criterio",
    abierta_desde: "2026-07-06",
  },
  {
    proyecto: "yajoma",
    titulo: "Cinco pares de clientes con NIF duplicado",
    opciones: ["Fusionarlos", "Dar acceso solo a uno de cada par"],
    bloqueado_por: "Solvos (S-06)",
    abierta_desde: "2026-06-22",
  },
  {
    proyecto: "yajoma",
    titulo: "Unidades de medida de los artículos",
    opciones: ["Dos artículos separados (B2B unidad, tienda kg)", "Una sola UoM"],
    bloqueado_por: "Yajoma, no urge",
    abierta_desde: "2026-06-15",
  },
  {
    proyecto: "yajoma",
    titulo: "Aprobación de las specs 015 y 016",
    opciones: ["Aprobar como están", "Pedir cambios"],
    bloqueado_por: "Revisión propia",
    abierta_desde: "2026-08-13",
  },
  {
    proyecto: "yajoma",
    titulo: "Sección de reparto y cálculo de ruta",
    opciones: [
      "Ruta con Google Maps (límite de diez paradas)",
      "Lista ordenada con ruta punto a punto",
      "Fuera de alcance",
    ],
    bloqueado_por: "Falta spec y falta saber si entra en alcance",
    abierta_desde: "2026-07-20",
  },
  {
    proyecto: "yajoma",
    titulo: "Estados bidireccionales entre app y Odoo",
    opciones: ["Sincronización bidireccional", "Solo push hacia Odoo"],
    bloqueado_por: null,
    abierta_desde: "2026-07-28",
  },
  {
    proyecto: "yajoma",
    titulo: "Multi-entidad: si El Buen Gusto y Vigo entran",
    opciones: ["Solo Yajoma Sabarís", "Las tres sociedades"],
    bloqueado_por: "Solvos: configuración de compañías",
    abierta_desde: "2026-06-30",
  },
  {
    proyecto: "yajoma",
    titulo: "Recetas: si existen y en qué formato",
    opciones: ["Recetas en Odoo", "Formato propio", "No hay recetas utilizables"],
    bloqueado_por: "Sesión pendiente con Emilio y definición de Lucía",
    abierta_desde: "2026-07-10",
  },
  {
    proyecto: "yajoma",
    titulo: "Reparto de responsabilidades entre evolk y Solvos en los albaranes",
    opciones: ["evolk extrae y Solvos integra", "evolk integra de punta a punta"],
    bloqueado_por: "Llamada Carlos–Antonio sin cerrar",
    abierta_desde: "2026-08-05",
  },
  {
    proyecto: "yajoma",
    titulo: "Papel del WhatsApp una vez viva la app",
    opciones: ["Fallback con IA", "Retirada"],
    bloqueado_por: null,
    abierta_desde: "2026-08-01",
  },
  {
    proyecto: "cribo",
    titulo: "Co-fundador de marketing",
    opciones: ["Incorporarlo", "Seguir en solitario"],
    bloqueado_por: "Su implicación sigue sin resolverse",
    abierta_desde: "2026-05-20",
  },
  {
    proyecto: "cribo",
    titulo: "Presupuesto del piloto",
    opciones: ["35.000–45.000 € (candidatura)", "45.000–55.000 € (informe inicial)"],
    bloqueado_por: "Seguro de RC con ciberriesgo y soporte de ciberseguridad sin cotizar",
    abierta_desde: "2026-06-10",
  },
  {
    proyecto: "cribo",
    titulo: "Infraestructura del piloto",
    opciones: ["GPU alquilada en la UE", "Máquina física en la gestoría"],
    bloqueado_por: "Coste mensual sin cerrar; el programa no garantiza GPU",
    abierta_desde: "2026-06-25",
  },
  {
    proyecto: "cribo",
    titulo: "Nombre de Tecsem en la web",
    opciones: ["Nombrarlos", 'Mantener "gestoría de Vigo"'],
    bloqueado_por: "Falta permiso por escrito de Tecsem",
    abierta_desde: "2026-07-15",
  },
  {
    proyecto: "cribo",
    titulo: "Dominio: cribo.es o cribo.app",
    opciones: ["cribo.es", "cribo.app"],
    bloqueado_por: "Comprobar disponibilidad",
    abierta_desde: "2026-08-03",
  },
  {
    proyecto: "cribo",
    titulo: "Registro de marca en clases 9 y 42",
    opciones: ["Contratar agente de propiedad industrial", "Presentar sin agente"],
    bloqueado_por: "Agente sin contratar y listado de clases sin redactar",
    abierta_desde: "2026-07-01",
  },
  {
    proyecto: "cribo",
    titulo: "Becarios de FP de Montecastelo",
    opciones: ["Incorporar becarios", "Seguir sin becarios"],
    bloqueado_por: "Montecastelo sin confirmar",
    abierta_desde: "2026-06-05",
  },
];

// Hitos del proyecto Flujo de specs (adenda 05). Un hito se marca como
// completado a mano; no son tareas.
const HITOS = [
  {
    titulo: "Plantillas y estados del flujo",
    entregable: "Plantillas de spec y ADR, estados y criterios de transición",
    estimacion_h: 20,
    orden: 1,
  },
  {
    titulo: "Primeras specs de Cribo",
    entregable: "Cinco primeras specs de Cribo escritas con el flujo",
    estimacion_h: 30,
    orden: 2,
  },
  {
    titulo: "Flujo para decisiones de negocio",
    entregable:
      "Flujo adaptado a decisiones de negocio, R6 afinada, specs de Yajoma retro-encajadas",
    estimacion_h: 30,
    orden: 3,
  },
];

// Plan semanal mínimo (encargo 3): la semana en curso con los dos
// resultados comprometidos que declara la adenda 04 y las tareas de
// semana justas para que el anillo orbital tenga base de cálculo. El
// ritual completo llega con el encargo 5 y el seed de tareas rico (H8.2)
// con el encargo 4 (ver DUDAS.md).
const RESULTADOS_SEMANA = [
  {
    proyecto: "yajoma",
    descripcion: "Specs 015 y 016 aprobadas y la 015 implementada en development.",
  },
  {
    proyecto: "cribo",
    descripcion: "Maqueta del hero y la entrada unificada revisada y cerrada.",
  },
] as const;

const TAREAS_SEMANA: {
  proyecto: "yajoma" | "cribo";
  titulo: string;
  estado: "semana" | "hecha";
  estimacion_min: number;
  siguiente_paso?: string;
}[] = [
  {
    proyecto: "yajoma",
    titulo: "Revisar y aprobar las specs 015 y 016",
    estado: "hecha",
    estimacion_min: 60,
  },
  {
    proyecto: "yajoma",
    titulo: "Implementar la spec 015 en development",
    estado: "semana",
    estimacion_min: 180,
    siguiente_paso: "Escribir la migración del mapa categoría a departamento",
  },
  {
    proyecto: "yajoma",
    titulo: "Preparar la resincronización del catálogo para el go-live",
    estado: "semana",
    estimacion_min: 120,
  },
  {
    proyecto: "cribo",
    titulo: "Revisar la maqueta del hero con el copy final",
    estado: "hecha",
    estimacion_min: 45,
  },
  {
    proyecto: "cribo",
    titulo: "Cerrar la entrada unificada de la web",
    estado: "semana",
    estimacion_min: 90,
  },
];

// Seed de tareas del encargo 4 (H8.2, en parte): unas treinta tareas
// repartidas por estados, con contenido sacado de los briefs de la adenda
// 04. Ninguna tarea nueva en estado semana o en_curso va a Yajoma o
// Cribo: sus fracciones del anillo (1/3 y 1/2) son datos que los tests de
// integración del encargo 3 asertan. Como mucho hay 2 tareas en curso que
// cuentan para el WIP: queda una plaza libre con el límite de R1 en 3.
type SemillaTarea = {
  proyecto: "yajoma" | "cribo" | "orbia" | "orbita" | "flujo-specs" | null;
  titulo: string;
  estado: "inbox" | "backlog" | "semana" | "en_curso" | "hecha" | "descartada";
  // Días hacia atrás desde el seed en que se capturó.
  capturada_hace: number;
  // Semana de la finalización, solo para hechas.
  completada?: "esta_semana" | "semana_pasada";
  estimacion_min?: number;
  siguiente_paso?: string;
  motivo_bloqueo?: string;
  vence_en_dias?: number;
  notas?: string;
};

const TAREAS_ENCARGO_4: SemillaTarea[] = [
  // Inbox: capturas crudas, la mayoría sin proyecto (R4).
  { proyecto: null, titulo: "Llamar a Siscom por el certificado TLS del servidor", estado: "inbox", capturada_hace: 1 },
  { proyecto: "cribo", titulo: "Mirar precios de GPU en Hetzner para el piloto", estado: "inbox", capturada_hace: 2 },
  { proyecto: null, titulo: "Apuntar los gastos de agosto para CAICONTA", estado: "inbox", capturada_hace: 3, vence_en_dias: -2 },
  { proyecto: null, titulo: "Leer el artículo guardado sobre onboarding B2B", estado: "inbox", capturada_hace: 4 },
  { proyecto: "orbia", titulo: "Renovar el dominio orbiasolutions.com", estado: "inbox", capturada_hace: 1, vence_en_dias: 20 },
  // Backlog por proyecto.
  { proyecto: "yajoma", titulo: "Escribir la spec 017 del push de pedidos a Odoo", estado: "backlog", capturada_hace: 9, estimacion_min: 120 },
  { proyecto: "yajoma", titulo: "Preparar el alta manual de los 178 clientes para el go-live", estado: "backlog", capturada_hace: 12, estimacion_min: 240, siguiente_paso: "Pedir a Alba el listado con emails verificados" },
  { proyecto: "yajoma", titulo: "Documentar la implantación para el organismo de la subvención", estado: "backlog", capturada_hace: 15, estimacion_min: 180, vence_en_dias: 12 },
  { proyecto: "cribo", titulo: "Cotizar el seguro de RC con ciberriesgo", estado: "backlog", capturada_hace: 10, estimacion_min: 60 },
  { proyecto: "cribo", titulo: "Comprobar disponibilidad de cribo.es y cribo.app", estado: "backlog", capturada_hace: 8, estimacion_min: 15 },
  { proyecto: "cribo", titulo: "Preparar el guion de la sesión de arranque con Tecsem", estado: "backlog", capturada_hace: 6, estimacion_min: 90, vence_en_dias: 14 },
  { proyecto: "orbia", titulo: "Esbozar la oferta empaquetada de automatización para pymes", estado: "backlog", capturada_hace: 18, estimacion_min: 120 },
  { proyecto: "orbia", titulo: "Actualizar la web de Orbia con el caso de Yajoma", estado: "backlog", capturada_hace: 14, estimacion_min: 90 },
  { proyecto: "orbita", titulo: "Revisar el ENTREGA del encargo 4", estado: "backlog", capturada_hace: 2, estimacion_min: 45 },
  { proyecto: "flujo-specs", titulo: "Extraer la plantilla de spec del máster", estado: "backlog", capturada_hace: 7, estimacion_min: 90 },
  // Semana y en curso, solo en proyectos sin resultado comprometido.
  { proyecto: "orbia", titulo: "Enviar la factura de agosto a Yajoma", estado: "semana", capturada_hace: 3, estimacion_min: 20, vence_en_dias: 5 },
  { proyecto: "flujo-specs", titulo: "Definir los estados de una spec y sus transiciones", estado: "semana", capturada_hace: 5, estimacion_min: 120, siguiente_paso: "Listar los estados que ya usa Yajoma de facto" },
  { proyecto: "orbita", titulo: "Verificar el encargo 4 en producción", estado: "semana", capturada_hace: 1, estimacion_min: 30 },
  { proyecto: "orbita", titulo: "Revisar la interfaz de tareas del encargo 4", estado: "en_curso", capturada_hace: 2, estimacion_min: 60, siguiente_paso: "Probar el aviso de WIP con tres en curso" },
  { proyecto: "orbia", titulo: "Preparar la propuesta para el segundo cliente", estado: "en_curso", capturada_hace: 11, estimacion_min: 150, siguiente_paso: "Cerrar el alcance de la fase 1 en una página" },
  { proyecto: "orbia", titulo: "Publicar el caso de éxito de Yajoma", estado: "en_curso", capturada_hace: 13, estimacion_min: 60, motivo_bloqueo: "Falta el visto bueno de Emilio para citar cifras" },
  // Hechas de la semana pasada.
  { proyecto: "yajoma", titulo: "Corregir el desbordamiento del catálogo en móvil", estado: "hecha", capturada_hace: 12, completada: "semana_pasada", estimacion_min: 45 },
  { proyecto: "yajoma", titulo: "Regenerar la API key de Odoo caducada", estado: "hecha", capturada_hace: 10, completada: "semana_pasada", estimacion_min: 15 },
  { proyecto: "cribo", titulo: "Enviar el copy final de la web a revisión", estado: "hecha", capturada_hace: 11, completada: "semana_pasada", estimacion_min: 30 },
  { proyecto: "cribo", titulo: "Preparar la documentación de arranque de startTIC", estado: "hecha", capturada_hace: 16, completada: "semana_pasada", estimacion_min: 120 },
  { proyecto: "orbita", titulo: "Revisar el ENTREGA del encargo 2", estado: "hecha", capturada_hace: 9, completada: "semana_pasada", estimacion_min: 45 },
  { proyecto: "flujo-specs", titulo: "Recopilar los ADRs existentes de Yajoma", estado: "hecha", capturada_hace: 14, completada: "semana_pasada", estimacion_min: 60 },
  // Hechas esta semana, fuera de Yajoma y Cribo.
  { proyecto: "orbita", titulo: "Revisar el ENTREGA del encargo 3", estado: "hecha", capturada_hace: 4, completada: "esta_semana", estimacion_min: 45 },
  { proyecto: "flujo-specs", titulo: "Leer el bloque 1 del máster de specs", estado: "hecha", capturada_hace: 6, completada: "esta_semana", estimacion_min: 90, notas: "Produjo la regla candidata: toda spec declara cómo se verifica." },
  // Descartadas.
  { proyecto: "orbita", titulo: "Probar otra herramienta de gestión de tareas", estado: "descartada", capturada_hace: 20 },
  { proyecto: "orbia", titulo: "Montar un CRM para Orbia", estado: "descartada", capturada_hace: 17 },
];

// Dos semanas de sesiones de trabajo (H8.2, en parte): cerradas con su
// nota, alguna sin siguiente paso de los tiempos en que R3 se saltaba, y
// una abandonada ya anotada. Ninguna activa: el cronómetro arranca limpio.
type SemillaSesion = {
  proyecto: "yajoma" | "cribo" | "orbia" | "orbita" | "flujo-specs";
  intencion: string;
  // "ayer" ancla la sesión al día civil anterior a la siembra (Europe/
  // Madrid): la sección de notas de ayer de la pantalla Hoy nunca nace
  // vacía, se siembre el día que se siembre.
  semana: "esta" | "pasada" | "ayer";
  // Día dentro de la semana (0 = lunes; con "ayer" se ignora) y hora
  // local aproximada.
  dia: number;
  hora: number;
  duracion_min: number;
  estado: "cerrada" | "abandonada";
  nota_avance?: string;
  nota_bloqueo?: string;
  siguiente_paso?: string;
  // Título de la tarea del seed a la que se vincula, si procede.
  tarea?: string;
};

const SESIONES_ENCARGO_4: SemillaSesion[] = [
  {
    proyecto: "yajoma",
    intencion: "Cerrar la revisión de las specs 015 y 016",
    semana: "pasada",
    dia: 0,
    hora: 9,
    duracion_min: 70,
    estado: "cerrada",
    nota_avance: "Specs revisadas con comentarios menores en la 016.",
    siguiente_paso: "Pasar los comentarios a la 016 y pedir aprobación",
  },
  {
    proyecto: "yajoma",
    intencion: "Reproducir el desbordamiento del catálogo en móvil",
    semana: "pasada",
    dia: 1,
    hora: 16,
    duracion_min: 45,
    estado: "cerrada",
    nota_avance: "Era el contenedor de filtros: corregido y desplegado en development.",
    siguiente_paso: "Comprobarlo en producción tras el siguiente deploy",
  },
  {
    proyecto: "yajoma",
    intencion: "Regenerar la API key de Odoo y verificar el sync",
    semana: "pasada",
    dia: 2,
    hora: 10,
    duracion_min: 25,
    estado: "cerrada",
    nota_avance: "Clave regenerada; el sync volvió a la primera.",
    nota_bloqueo: "Seguimos sin aviso previo de caducidad: riesgo S-14 abierto.",
  },
  {
    proyecto: "cribo",
    intencion: "Repasar el copy final de la web antes de enviarlo",
    semana: "pasada",
    dia: 2,
    hora: 17,
    duracion_min: 40,
    estado: "cerrada",
    nota_avance: "Copy enviado a revisión con dos dudas marcadas.",
    siguiente_paso: "Esperar la vuelta y cerrar el hero",
  },
  {
    proyecto: "cribo",
    intencion: "Ordenar la documentación de startTIC",
    semana: "pasada",
    dia: 3,
    hora: 11,
    duracion_min: 90,
    estado: "abandonada",
    nota_avance: "Documentación ordenada a medias; me llamaron de Yajoma y no volví.",
    // Sin siguiente paso: quedó abandonada y se anotó después.
  },
  {
    proyecto: "orbia",
    intencion: "Esbozar la propuesta del segundo cliente",
    semana: "pasada",
    dia: 4,
    hora: 9,
    duracion_min: 60,
    estado: "cerrada",
    nota_avance: "Estructura de la propuesta hecha; falta el precio.",
    siguiente_paso: "Cerrar el alcance de la fase 1 en una página",
    tarea: "Preparar la propuesta para el segundo cliente",
  },
  {
    proyecto: "yajoma",
    intencion: "Arrancar la implementación de la spec 015",
    semana: "esta",
    dia: 0,
    hora: 9,
    duracion_min: 85,
    estado: "cerrada",
    nota_avance: "Migración del mapa categoría a departamento escrita y probada en local.",
    siguiente_paso: "Escribir la migración del mapa categoría a departamento",
    tarea: "Implementar la spec 015 en development",
  },
  {
    proyecto: "cribo",
    intencion: "Revisar la maqueta del hero con el copy final",
    semana: "esta",
    dia: 0,
    hora: 16,
    duracion_min: 45,
    estado: "cerrada",
    nota_avance: "Maqueta revisada y aprobada: el hero queda cerrado.",
    siguiente_paso: "Pasar a la entrada unificada",
    tarea: "Revisar la maqueta del hero con el copy final",
  },
  {
    proyecto: "orbita",
    intencion: "Revisar la entrega del encargo 3 en producción",
    semana: "esta",
    dia: 0,
    hora: 19,
    duracion_min: 30,
    estado: "cerrada",
    nota_avance: "Anillo y decisiones revisados en producción; todo en orden.",
    siguiente_paso: "Lanzar el encargo 4 con el ENTREGA adjunto",
    tarea: "Revisar el ENTREGA del encargo 3",
  },
  {
    proyecto: "orbita",
    intencion: "Probar la captura y el límite de WIP del encargo 4",
    semana: "esta",
    dia: 1,
    hora: 12,
    duracion_min: 55,
    estado: "cerrada",
    nota_avance: "Captura con la tecla c probada; el aviso de WIP muestra las tres en curso.",
    siguiente_paso: "Probar el aviso de WIP con tres en curso",
    tarea: "Revisar la interfaz de tareas del encargo 4",
  },
  {
    proyecto: "flujo-specs",
    intencion: "Leer el bloque 1 del máster produciendo artefacto",
    semana: "esta",
    dia: 1,
    hora: 18,
    duracion_min: 75,
    estado: "cerrada",
    nota_avance: "Bloque 1 leído; salió una regla candidata para el Playbook.",
    siguiente_paso: "Listar los estados que ya usa Yajoma de facto",
    tarea: "Leer el bloque 1 del máster de specs",
  },
  // Encargo suelto de la pantalla Hoy: una nota de cierre de ayer
  // garantizada, se siembre el día que se siembre.
  {
    proyecto: "orbita",
    intencion: "Dejar preparado el encargo de la pantalla Hoy",
    semana: "ayer",
    dia: 0,
    hora: 18,
    duracion_min: 40,
    estado: "cerrada",
    nota_avance: "Encargo redactado con las cuatro secciones y su orden.",
    siguiente_paso: "Revisar la pantalla Hoy en cuanto se despliegue",
  },
];

// ---------- Carga ----------

async function main() {
  const ahora = new Date();

  // Orden de borrado: hijos antes que padres.
  await prisma.$transaction([
    prisma.finding.deleteMany(),
    prisma.researchIntent.deleteMany(),
    prisma.source.deleteMany(),
    prisma.digestRun.deleteMany(),
    prisma.wipRejection.deleteMany(),
    prisma.taskEvent.deleteMany(),
    prisma.workSession.deleteMany(),
    prisma.task.deleteMany(),
    prisma.retro.deleteMany(),
    prisma.weeklyOutcome.deleteMany(),
    prisma.weeklyPlan.deleteMany(),
    prisma.adherenceMetric.deleteMany(),
    prisma.ritualSnooze.deleteMany(),
    prisma.playbookRule.deleteMany(),
    prisma.playbook.deleteMany(),
    prisma.note.deleteMany(),
    prisma.decision.deleteMany(),
    prisma.milestone.deleteMany(),
    prisma.projectBrief.deleteMany(),
    prisma.project.deleteMany(),
  ]);

  // Proyectos con su brief versión 1.
  const porSlug: Record<string, string> = {};
  for (const p of PROYECTOS) {
    const proyecto = await prisma.project.create({
      data: {
        user_id: USER_ID,
        nombre: p.nombre,
        cliente: p.cliente,
        slug: p.slug,
        objetivo: p.objetivo,
        estado: "activo",
        color_acento: p.color_acento,
        orden: p.orden,
        tipo: "entrega",
        horas_objetivo: null,
      },
    });
    porSlug[p.slug] = proyecto.id;
    await prisma.projectBrief.create({
      data: {
        user_id: USER_ID,
        project_id: proyecto.id,
        version: 1,
        contenido_md: p.brief,
        content_hash: hashContenido(p.brief),
        secciones: parsearSecciones(p.brief) as Prisma.InputJsonValue,
      },
    });
  }

  // Playbook base, versión 1, con las seis reglas.
  const playbook = await prisma.playbook.create({
    data: {
      user_id: USER_ID,
      version: 1,
      changelog:
        "Versión inicial: las cinco reglas base del brief maestro más la R6 de la adenda de datos reales.",
    },
  });
  for (const r of REGLAS) {
    await prisma.playbookRule.create({
      data: {
        user_id: USER_ID,
        playbook_id: playbook.id,
        clave: r.clave,
        texto: r.texto,
        categoria: r.categoria,
        activa: true,
        validacion_dura: r.validacion_dura,
        parametros:
          r.parametros === null
            ? Prisma.JsonNull
            : (r.parametros as unknown as Prisma.InputJsonValue),
      },
    });
  }

  // Las diecisiete decisiones abiertas de Yajoma y Cribo.
  for (const d of DECISIONES) {
    const abierta = new Date(d.abierta_desde + "T09:00:00+02:00");
    await prisma.decision.create({
      data: {
        user_id: USER_ID,
        project_id: porSlug[d.proyecto],
        titulo: d.titulo,
        opciones: d.opciones as unknown as Prisma.InputJsonValue,
        bloqueado_por: d.bloqueado_por,
        estado: "abierta",
        abierta_desde: abierta,
        dias_abierta: diasDesde(abierta, ahora),
      },
    });
  }

  // Los tres hitos de Flujo de specs.
  for (const h of HITOS) {
    await prisma.milestone.create({
      data: {
        user_id: USER_ID,
        project_id: porSlug["flujo-specs"],
        titulo: h.titulo,
        entregable: h.entregable,
        estimacion_h: h.estimacion_h,
        orden: h.orden,
      },
    });
  }

  // El plan de la semana en curso con sus dos resultados comprometidos y
  // las tareas mínimas del anillo (encargo 3).
  const plan = await prisma.weeklyPlan.create({
    data: {
      user_id: USER_ID,
      semana_inicio: inicioDeSemana(ahora),
      proyectos_activos: RESULTADOS_SEMANA.map((r) => r.proyecto) as unknown as Prisma.InputJsonValue,
      completado_paso: 4,
    },
  });
  for (const r of RESULTADOS_SEMANA) {
    await prisma.weeklyOutcome.create({
      data: {
        user_id: USER_ID,
        weekly_plan_id: plan.id,
        project_id: porSlug[r.proyecto],
        descripcion: r.descripcion,
        cumplido: null,
      },
    });
  }
  // Completadas dentro de la semana en curso, pase cuando pase el seed.
  const inicioSemana = instanteInicioDeSemana(ahora).getTime();
  const completadaEl = new Date(
    Math.max(inicioSemana + 3_600_000, ahora.getTime() - 3 * 3_600_000)
  );

  // Cadena de estados por la que pasó una tarea hasta su estado actual,
  // para retro-generar su log de transiciones (DUDA 20 resuelta): el
  // detalle de tarea no nace vacío. Las descartadas del seed se
  // descartaron desde el inbox.
  const CADENAS: Record<string, string[]> = {
    inbox: ["inbox"],
    backlog: ["inbox", "backlog"],
    semana: ["inbox", "backlog", "semana"],
    en_curso: ["inbox", "backlog", "semana", "en_curso"],
    hecha: ["inbox", "backlog", "semana", "hecha"],
    descartada: ["inbox", "descartada"],
  };

  // Crea una tarea con su rastro de eventos: creación en inbox en
  // `capturada`, y el resto de transiciones repartidas hasta `ultima`.
  async function crearTareaConEventos(datos: {
    proyectoSlug: string | null;
    titulo: string;
    estado: string;
    capturada: Date;
    ultima: Date;
    estimacion_min?: number | null;
    siguiente_paso?: string | null;
    motivo_bloqueo?: string | null;
    vence_el?: Date | null;
    notas?: string | null;
    completed_at?: Date | null;
  }) {
    const cadena = CADENAS[datos.estado];
    const tarea = await prisma.task.create({
      data: {
        user_id: USER_ID,
        project_id: datos.proyectoSlug ? porSlug[datos.proyectoSlug] : null,
        titulo: datos.titulo,
        estado: datos.estado as "inbox",
        estimacion_min: datos.estimacion_min ?? null,
        siguiente_paso: datos.siguiente_paso ?? null,
        motivo_bloqueo: datos.motivo_bloqueo ?? null,
        vence_el: datos.vence_el ?? null,
        notas: datos.notas ?? null,
        origen: "manual",
        completed_at: datos.completed_at ?? null,
        created_at: datos.capturada,
      },
    });
    const tramo = (datos.ultima.getTime() - datos.capturada.getTime()) / cadena.length;
    for (let i = 0; i < cadena.length; i++) {
      const esUltimo = i === cadena.length - 1;
      await prisma.taskEvent.create({
        data: {
          user_id: USER_ID,
          task_id: tarea.id,
          estado_anterior: i === 0 ? null : cadena[i - 1],
          estado_nuevo: cadena[i],
          created_at: esUltimo && datos.completed_at
            ? datos.completed_at
            : new Date(datos.capturada.getTime() + tramo * i),
        },
      });
    }
    return tarea;
  }

  // Las cinco tareas del plan semanal (encargo 3), ahora con su log.
  const tareasPorTitulo: Record<string, string> = {};
  for (const t of TAREAS_SEMANA) {
    const tarea = await crearTareaConEventos({
      proyectoSlug: t.proyecto,
      titulo: t.titulo,
      estado: t.estado,
      capturada: new Date(ahora.getTime() - 5 * 86_400_000),
      ultima: t.estado === "hecha" ? completadaEl : ahora,
      estimacion_min: t.estimacion_min,
      siguiente_paso: t.siguiente_paso ?? null,
      completed_at: t.estado === "hecha" ? completadaEl : null,
    });
    tareasPorTitulo[t.titulo] = tarea.id;
  }

  // El seed de tareas del encargo 4 (H8.2, en parte).
  const finSemanaPasada = new Date(inicioSemana - 3_600_000);
  for (const t of TAREAS_ENCARGO_4) {
    const capturada = new Date(ahora.getTime() - t.capturada_hace * 86_400_000);
    const completada =
      t.estado === "hecha"
        ? t.completada === "esta_semana"
          ? completadaEl
          : new Date(Math.max(finSemanaPasada.getTime() - 2 * 86_400_000, capturada.getTime() + 3_600_000))
        : null;
    const tarea = await crearTareaConEventos({
      proyectoSlug: t.proyecto,
      titulo: t.titulo,
      estado: t.estado,
      capturada,
      ultima: completada ?? new Date(Math.min(ahora.getTime(), capturada.getTime() + 2 * 86_400_000)),
      estimacion_min: t.estimacion_min ?? null,
      siguiente_paso: t.siguiente_paso ?? null,
      motivo_bloqueo: t.motivo_bloqueo ?? null,
      vence_el: t.vence_en_dias !== undefined
        ? new Date(ahora.getTime() + t.vence_en_dias * 86_400_000)
        : null,
      notas: t.notas ?? null,
      completed_at: completada,
    });
    tareasPorTitulo[t.titulo] = tarea.id;
  }

  // La tarea bloqueada del seed apunta a la que la bloquea (H2.5).
  await prisma.task.update({
    where: { id: tareasPorTitulo["Publicar el caso de éxito de Yajoma"] },
    data: { bloqueada_por: tareasPorTitulo["Actualizar la web de Orbia con el caso de Yajoma"] },
  });

  // Dos semanas de sesiones de trabajo, ninguna activa.
  const inicioSemanaPasada = inicioSemana - 7 * 86_400_000;
  const inicioAyer = rangoDeAyer(ahora).inicio.getTime();
  for (const s of SESIONES_ENCARGO_4) {
    const base =
      s.semana === "esta" ? inicioSemana : s.semana === "ayer" ? inicioAyer : inicioSemanaPasada;
    const dia = s.semana === "ayer" ? 0 : s.dia;
    let empieza = new Date(base + dia * 86_400_000 + s.hora * 3_600_000);
    // Nunca en el futuro: si el seed corre un lunes a primera hora, las
    // sesiones de esta semana se comprimen hacia atrás desde ahora.
    if (empieza.getTime() + s.duracion_min * 60_000 > ahora.getTime()) {
      empieza = new Date(ahora.getTime() - (s.duracion_min + 30) * 60_000);
    }
    const termina = new Date(empieza.getTime() + s.duracion_min * 60_000);
    await prisma.workSession.create({
      data: {
        user_id: USER_ID,
        project_id: porSlug[s.proyecto],
        task_id: s.tarea ? tareasPorTitulo[s.tarea] ?? null : null,
        intencion: s.intencion,
        started_at: empieza,
        ended_at: termina,
        duracion_min: s.duracion_min,
        nota_avance: s.nota_avance ?? null,
        nota_bloqueo: s.nota_bloqueo ?? null,
        siguiente_paso: s.siguiente_paso ?? null,
        estado: s.estado,
        created_at: empieza,
      },
    });
  }

  // Rechazos por límite de WIP (encargo 4b): origen de datos de la
  // métrica de adherencia de R1 (H5.3). Dos de la semana pasada y uno de
  // esta, sobre tareas que estaban en semana cuando se intentó empezarlas.
  const RECHAZOS_WIP: { tarea: string; semana: "esta" | "pasada"; dia: number; hora: number }[] = [
    { tarea: "Enviar la factura de agosto a Yajoma", semana: "pasada", dia: 1, hora: 11 },
    { tarea: "Definir los estados de una spec y sus transiciones", semana: "pasada", dia: 3, hora: 17 },
    { tarea: "Verificar el encargo 4 en producción", semana: "esta", dia: 0, hora: 10 },
  ];
  for (const r of RECHAZOS_WIP) {
    const base = r.semana === "esta" ? inicioSemana : inicioSemanaPasada;
    let momento = new Date(base + r.dia * 86_400_000 + r.hora * 3_600_000);
    if (momento.getTime() > ahora.getTime()) {
      momento = new Date(ahora.getTime() - 45 * 60_000);
    }
    await prisma.wipRejection.create({
      data: {
        user_id: USER_ID,
        task_id: tareasPorTitulo[r.tarea],
        limite: 3,
        created_at: momento,
      },
    });
  }

  // ---------- Encargo 5: rituales y adherencia ----------
  // El plan completo de la semana pasada con su retro y los resultados
  // verificados; dos triajes de ritual del lunes pasado (métrica R4);
  // sesiones y rechazos más antiguos y un plan de hace dos semanas para
  // que las barras de ocho semanas no nazcan vacías; y tres decisiones ya
  // cerradas para la métrica de R6 (dos con motivo, una sin él).

  const haceSemanas = (n: number) => new Date(ahora.getTime() - n * 7 * 86_400_000);

  // Plan de la semana pasada, completo, con los dos comprometidos
  // verificados en la retro: Yajoma salió, Cribo no.
  const planPasado = await prisma.weeklyPlan.create({
    data: {
      user_id: USER_ID,
      semana_inicio: inicioDeSemana(haceSemanas(1)),
      proyectos_activos: ["yajoma", "cribo"] as unknown as Prisma.InputJsonValue,
      completado_paso: 4,
      created_at: new Date(inicioSemanaPasada + 8 * 3_600_000),
    },
  });
  const RESULTADOS_PASADOS = [
    {
      proyecto: "yajoma" as const,
      descripcion: "Las specs 015 a 017 retro-encajadas y aprobadas por Jaime",
      cumplido: true,
    },
    {
      proyecto: "cribo" as const,
      descripcion: "La landing del piloto publicada con el formulario de alta",
      cumplido: false,
    },
  ];
  for (const r of RESULTADOS_PASADOS) {
    await prisma.weeklyOutcome.create({
      data: {
        user_id: USER_ID,
        weekly_plan_id: planPasado.id,
        project_id: porSlug[r.proyecto],
        descripcion: r.descripcion,
        cumplido: r.cumplido,
      },
    });
  }

  // Dos capturas de hace dos semanas triadas en el ritual del lunes
  // pasado: el numerador de la métrica de R4 no nace vacío.
  const TRIAJES_DE_RITUAL = [
    { titulo: "Preparar la propuesta del piloto de Cribo para la asesoría", proyecto: "cribo" },
    { titulo: "Documentar el patrón de eco en formularios con validación", proyecto: "flujo-specs" },
  ];
  let capturaRitual = new Date(inicioSemana - 10 * 86_400_000 + 17 * 3_600_000);
  for (const t of TRIAJES_DE_RITUAL) {
    const tarea = await prisma.task.create({
      data: {
        user_id: USER_ID,
        project_id: porSlug[t.proyecto],
        titulo: t.titulo,
        estado: "backlog",
        origen: "manual",
        created_at: capturaRitual,
      },
    });
    await prisma.taskEvent.create({
      data: {
        user_id: USER_ID,
        task_id: tarea.id,
        estado_anterior: null,
        estado_nuevo: "inbox",
        created_at: capturaRitual,
      },
    });
    await prisma.taskEvent.create({
      data: {
        user_id: USER_ID,
        task_id: tarea.id,
        estado_anterior: "inbox",
        estado_nuevo: "backlog",
        via_ritual: true,
        created_at: new Date(inicioSemanaPasada + 9 * 3_600_000),
      },
    });
    capturaRitual = new Date(capturaRitual.getTime() + 2 * 3_600_000);
  }

  // Retro de la semana pasada, con la foto de las métricas calculada de
  // los datos sembrados, no inventada.
  const metricasPasadas = await metricasDeLaSemana(prisma, haceSemanas(1));
  await prisma.retro.create({
    data: {
      user_id: USER_ID,
      weekly_plan_id: planPasado.id,
      que_funciono: "Agrupar las sesiones de Yajoma por la mañana: las specs salieron en tres bloques.",
      que_no: "La landing de Cribo se quedó sin hueco: demasiado triaje disperso entre semana.",
      que_pruebo: "Reservar el martes y el jueves de 9 a 11 para Cribo, sin excepciones.",
      metricas: metricasPasadas as unknown as Prisma.InputJsonValue,
      created_at: new Date(inicioSemana - 2 * 86_400_000 + 18 * 3_600_000),
    },
  });

  // Un plan de hace dos semanas con cuatro activos: la semana en la que
  // R2 no se cumplió. Sin retro: R5 queda sin dato, como fue.
  await prisma.weeklyPlan.create({
    data: {
      user_id: USER_ID,
      semana_inicio: inicioDeSemana(haceSemanas(2)),
      proyectos_activos: ["yajoma", "cribo", "orbia", "orbita"] as unknown as Prisma.InputJsonValue,
      completado_paso: 4,
      created_at: new Date(inicioSemana - 14 * 86_400_000 + 8 * 3_600_000),
    },
  });

  // Sesiones de las semanas anteriores, para las barras de R3.
  const SESIONES_ANTIGUAS: {
    proyecto: "yajoma" | "cribo" | "orbia" | "orbita" | "flujo-specs";
    hace: number;
    dia: number;
    hora: number;
    duracion: number;
    estado: "cerrada" | "abandonada";
    conNota: boolean;
    intencion: string;
  }[] = [
    { proyecto: "yajoma", hace: 2, dia: 0, hora: 10, duracion: 90, estado: "cerrada", conNota: true, intencion: "Cerrar el mapeo de estados de pedido con Odoo" },
    // Abandonada con la nota escrita al día siguiente: no sale de
    // abandonada (H3.3) y no cuenta como con nota en la métrica de R3.
    { proyecto: "cribo", hace: 2, dia: 2, hora: 16, duracion: 50, estado: "abandonada", conNota: false, intencion: "Bocetar la pantalla de resultados del triaje" },
    { proyecto: "cribo", hace: 3, dia: 1, hora: 9, duracion: 110, estado: "cerrada", conNota: true, intencion: "Afinar el prompt de clasificación documental" },
    // Cerrada con avance pero sin siguiente paso (R3 estaba en prueba):
    // el avance es obligatorio siempre; solo falta el siguiente paso.
    { proyecto: "orbia", hace: 3, dia: 3, hora: 12, duracion: 40, estado: "cerrada", conNota: false, intencion: "Repasar la facturación del trimestre" },
    { proyecto: "yajoma", hace: 4, dia: 1, hora: 10, duracion: 95, estado: "cerrada", conNota: true, intencion: "Revisar las specs 012 y 013 con el feedback de Jaime" },
  ];
  for (const s of SESIONES_ANTIGUAS) {
    const empieza = new Date(
      inicioSemana - s.hace * 7 * 86_400_000 + s.dia * 86_400_000 + s.hora * 3_600_000
    );
    const termina = new Date(empieza.getTime() + s.duracion * 60_000);
    await prisma.workSession.create({
      data: {
        user_id: USER_ID,
        project_id: porSlug[s.proyecto],
        intencion: s.intencion,
        started_at: empieza,
        ended_at: termina,
        duracion_min: s.duracion,
        estado: s.estado,
        nota_avance:
          s.estado === "abandonada"
            ? "Quedó abandonada; el boceto se retomó al día siguiente."
            : "Avance registrado al cerrar la sesión.",
        siguiente_paso: s.conNota ? "Anotado en la tarea correspondiente." : null,
        created_at: empieza,
      },
    });
  }

  // Rechazos de WIP más antiguos, para que la barra de R1 tenga historia.
  const RECHAZOS_ANTIGUOS = [
    { tarea: "Enviar la factura de agosto a Yajoma", hace: 2, dia: 1, hora: 12 },
    { tarea: "Definir los estados de una spec y sus transiciones", hace: 3, dia: 3, hora: 16 },
  ];
  for (const r of RECHAZOS_ANTIGUOS) {
    await prisma.wipRejection.create({
      data: {
        user_id: USER_ID,
        task_id: tareasPorTitulo[r.tarea],
        limite: 3,
        created_at: new Date(
          inicioSemana - r.hace * 7 * 86_400_000 + r.dia * 86_400_000 + r.hora * 3_600_000
        ),
      },
    });
  }

  // Tres decisiones ya cerradas (la métrica de R6 mide el motivo
  // registrado): dos con motivo y una sin él, cerrada antes de que
  // existiera la regla.
  const DECISIONES_CERRADAS = [
    {
      proyecto: "yajoma",
      titulo: "Pasarela de pago del portal de pedidos B2B",
      opciones: ["Stripe", "Redsys con el TPV del banco"],
      elegida: "Redsys con el TPV del banco",
      motivo: "El banco de Yajoma bonifica el TPV y la asesoría ya lo tiene contratado.",
      abiertaHaceDias: 34,
      cerradaHaceSemanas: 1,
      diaDeCierre: 2,
    },
    {
      proyecto: "cribo",
      titulo: "Nombre del plan gratuito del piloto",
      opciones: ["Starter", "Gratis"],
      elegida: "Gratis",
      motivo: null,
      abiertaHaceDias: 45,
      cerradaHaceSemanas: 2,
      diaDeCierre: 3,
    },
    {
      proyecto: "yajoma",
      titulo: "Versión de Odoo sobre la que construir el módulo de pedidos",
      opciones: ["Quedarse en la 16", "Migrar a la 17 antes del módulo"],
      elegida: "Migrar a la 17 antes del módulo",
      motivo: "Yajoma migra a la 17 en octubre; construir dos veces no tiene sentido.",
      abiertaHaceDias: 52,
      cerradaHaceSemanas: 3,
      diaDeCierre: 1,
    },
  ];
  for (const d of DECISIONES_CERRADAS) {
    const cerrada = new Date(
      inicioSemana - d.cerradaHaceSemanas * 7 * 86_400_000 + d.diaDeCierre * 86_400_000 + 13 * 3_600_000
    );
    const abierta = new Date(cerrada.getTime() - d.abiertaHaceDias * 86_400_000);
    await prisma.decision.create({
      data: {
        user_id: USER_ID,
        project_id: porSlug[d.proyecto],
        titulo: d.titulo,
        opciones: d.opciones as unknown as Prisma.InputJsonValue,
        estado: "cerrada",
        opcion_elegida: d.elegida,
        motivo: d.motivo,
        abierta_desde: abierta,
        cerrada_el: cerrada,
        dias_abierta: d.abiertaHaceDias,
      },
    });
  }

  const resumen = {
    proyectos: await prisma.project.count(),
    briefs: await prisma.projectBrief.count(),
    reglas: await prisma.playbookRule.count(),
    decisiones: await prisma.decision.count(),
    hitos: await prisma.milestone.count(),
    planes: await prisma.weeklyPlan.count(),
    resultados: await prisma.weeklyOutcome.count(),
    retros: await prisma.retro.count(),
    tareas: await prisma.task.count(),
    eventos: await prisma.taskEvent.count(),
    eventos_ritual: await prisma.taskEvent.count({ where: { via_ritual: true } }),
    sesiones: await prisma.workSession.count(),
    rechazos_wip: await prisma.wipRejection.count(),
  };
  console.log("Seed cargado:", JSON.stringify(resumen));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
