// Capa de servicio del encargo 3: reglas de negocio de proyectos, brief
// vivo y decisiones, validadas en el servidor. Las server actions de la
// interfaz son envoltorios finos sobre estas funciones; los tests de
// integración las ejercitan directamente contra la base.

import type { Prisma, PrismaClient } from "@prisma/client";
import { hashContenido, normalizarContenido, parsearSecciones } from "./brief";
import { diasAbierta, diasEntre, opcionesComoLista, validarCierre } from "./decisiones";
import {
  generarSlug,
  mensajeCreadoEnPausa,
  mensajeLimiteAlActivar,
  siguienteColorAcento,
  validarDatosProyecto,
  type DatosProyecto,
} from "./proyectos";
import { cierreDelAnillo, cuentaParaLimiteDeActivos, type TipoProyecto } from "./reglas-proyecto";
import { inicioDeSemana, instanteFinDeSemana, instanteInicioDeSemana } from "./semana";

// Prisma acepta tanto el cliente como una transacción.
export type Db = PrismaClient | Prisma.TransactionClient;

const USER_ID = "vluna";

// ---------- Reglas del playbook que este encargo consume ----------

// Límite de proyectos activos (R2). Lee la regla de la última versión del
// playbook: si está desactivada no hay validación (H5.1 lo pedirá así);
// si está activa, el límite vive en parametros.limite.
export async function limiteDeActivos(db: Db): Promise<number | null> {
  const regla = await db.playbookRule.findFirst({
    where: { clave: "R2", retirada_el: null },
    orderBy: { playbook: { version: "desc" } },
  });
  if (!regla || !regla.activa) return null;
  const parametros = regla.parametros as { limite?: number } | null;
  return parametros?.limite ?? 3;
}

// Umbral de días de la regla R6 para destacar decisiones abiertas.
export async function umbralDiasR6(db: Db): Promise<number | null> {
  const regla = await db.playbookRule.findFirst({
    where: { clave: "R6", retirada_el: null },
    orderBy: { playbook: { version: "desc" } },
  });
  if (!regla || !regla.activa) return null;
  const parametros = regla.parametros as { dias_umbral?: number } | null;
  return parametros?.dias_umbral ?? 21;
}

// Proyectos activos que ocupan plaza del límite (los de tipo entrega;
// los continuos no cuentan, adenda 05).
async function activosQueOcupanPlaza(db: Db): Promise<number> {
  const activos = await db.project.findMany({
    where: { estado: "activo" },
    select: { tipo: true },
  });
  return activos.filter((p) => cuentaParaLimiteDeActivos(p.tipo as TipoProyecto)).length;
}

// ---------- Proyectos (H1.1, H1.3) ----------

export type ResultadoCrear =
  | { ok: true; slug: string; aviso: string | null }
  | { ok: false; error: string };

// Crea un proyecto. Con el cupo de activos lleno no da error: lo crea en
// pausa y avisa (H1.1). El color de acento se asigna solo, de la paleta.
export async function crearProyecto(db: PrismaClient, entrada: DatosProyecto): Promise<ResultadoCrear> {
  const validacion = validarDatosProyecto(entrada);
  if (!validacion.ok) return { ok: false, error: validacion.error };
  const datos = validacion.datos;

  return db.$transaction(async (tx) => {
    const existentes = await tx.project.findMany({
      select: { slug: true, color_acento: true, orden: true },
    });

    let slug = generarSlug(datos.nombre);
    const slugs = new Set(existentes.map((p) => p.slug));
    for (let n = 2; slugs.has(slug); n++) {
      slug = `${generarSlug(datos.nombre)}-${n}`;
    }

    const limite = await limiteDeActivos(tx);
    const ocupadas = await activosQueOcupanPlaza(tx);
    const sinPlaza = limite !== null && ocupadas >= limite;

    await tx.project.create({
      data: {
        user_id: USER_ID,
        nombre: datos.nombre,
        cliente: datos.cliente,
        slug,
        objetivo: datos.objetivo,
        estado: sinPlaza ? "pausado" : "activo",
        color_acento: siguienteColorAcento(existentes.map((p) => p.color_acento)),
        orden: Math.max(0, ...existentes.map((p) => p.orden)) + 1,
        tipo: "entrega",
        horas_objetivo: null,
      },
    });

    return { ok: true as const, slug, aviso: sinPlaza ? mensajeCreadoEnPausa(limite) : null };
  });
}

export type ResultadoSimple = { ok: true } | { ok: false; error: string };

export async function actualizarProyecto(
  db: PrismaClient,
  slug: string,
  entrada: DatosProyecto
): Promise<ResultadoSimple> {
  const validacion = validarDatosProyecto(entrada);
  if (!validacion.ok) return { ok: false, error: validacion.error };
  const proyecto = await db.project.findUnique({ where: { slug } });
  if (!proyecto) return { ok: false, error: "El proyecto no existe." };
  await db.project.update({ where: { id: proyecto.id }, data: validacion.datos });
  return { ok: true };
}

export type EstadoDestino = "activo" | "pausado" | "archivado";

// Cambia el estado de un proyecto. Activar valida el límite de R2 en el
// servidor: con el cupo lleno se rechaza con el aviso, no se fuerza.
export async function cambiarEstadoProyecto(
  db: PrismaClient,
  slug: string,
  destino: EstadoDestino
): Promise<ResultadoSimple> {
  return db.$transaction(async (tx) => {
    const proyecto = await tx.project.findUnique({ where: { slug } });
    if (!proyecto) return { ok: false as const, error: "El proyecto no existe." };
    if (proyecto.estado === destino) return { ok: true as const };

    if (destino === "activo" && cuentaParaLimiteDeActivos(proyecto.tipo as TipoProyecto)) {
      const limite = await limiteDeActivos(tx);
      if (limite !== null) {
        const ocupadas = await activosQueOcupanPlaza(tx);
        if (ocupadas >= limite) {
          return { ok: false as const, error: mensajeLimiteAlActivar(limite) };
        }
      }
    }

    await tx.project.update({ where: { id: proyecto.id }, data: { estado: destino } });
    return { ok: true as const };
  });
}

// ---------- Brief vivo (H1.2) ----------

export type ResultadoBrief =
  | { ok: true; version: number; sinCambios: boolean }
  | { ok: false; error: string };

// Guarda el brief. Solo crea versión nueva si el hash del contenido
// normalizado cambia: un retoque de formato no genera versión ni ruido.
export async function guardarBrief(
  db: PrismaClient,
  slug: string,
  contenidoMd: string
): Promise<ResultadoBrief> {
  if (normalizarContenido(contenidoMd) === "") {
    return { ok: false, error: "El brief está vacío. Escribe al menos el contexto." };
  }
  return db.$transaction(async (tx) => {
    const proyecto = await tx.project.findUnique({ where: { slug } });
    if (!proyecto) return { ok: false as const, error: "El proyecto no existe." };

    const ultima = await tx.projectBrief.findFirst({
      where: { project_id: proyecto.id },
      orderBy: { version: "desc" },
    });

    const hash = hashContenido(contenidoMd);
    if (ultima && ultima.content_hash === hash) {
      return { ok: true as const, version: ultima.version, sinCambios: true };
    }

    const version = (ultima?.version ?? 0) + 1;
    await tx.projectBrief.create({
      data: {
        user_id: USER_ID,
        project_id: proyecto.id,
        version,
        contenido_md: contenidoMd,
        content_hash: hash,
        secciones: parsearSecciones(contenidoMd) as Prisma.InputJsonValue,
      },
    });
    return { ok: true as const, version, sinCambios: false };
  });
}

// Aviso de H1.2: el brief cambió desde la última derivación de intents.
// Compara el hash actual con el hash de la versión guardada en los
// intents activos, no el número de versión: volver al contenido anterior
// o retocar el formato no debe pedir regeneración.
export async function briefCambioDesdeDerivacion(db: Db, projectId: string): Promise<boolean> {
  const [actual, intent] = await Promise.all([
    db.projectBrief.findFirst({
      where: { project_id: projectId },
      orderBy: { version: "desc" },
      select: { content_hash: true },
    }),
    db.researchIntent.findFirst({
      where: { project_id: projectId, activo: true, derivado_de_brief_version: { not: null } },
      orderBy: { derivado_de_brief_version: "desc" },
      select: { derivado_de_brief_version: true },
    }),
  ]);
  if (!actual || !intent?.derivado_de_brief_version) return false;
  const origen = await db.projectBrief.findFirst({
    where: { project_id: projectId, version: intent.derivado_de_brief_version },
    select: { content_hash: true },
  });
  if (!origen) return true;
  return origen.content_hash !== actual.content_hash;
}

// ---------- Decisiones (adenda 04) ----------

export type ResultadoCierreDecision = { ok: true } | { ok: false; error: string };

// Cierra una decisión: registra la opción elegida y el motivo, pasa el
// estado a cerrada, guarda cerrada_el y congela dias_abierta (DUDA 2).
export async function cerrarDecision(
  db: PrismaClient,
  decisionId: string,
  opcionElegida: string,
  motivo: string,
  ahora: Date = new Date()
): Promise<ResultadoCierreDecision> {
  return db.$transaction(async (tx) => {
    const decision = await tx.decision.findUnique({ where: { id: decisionId } });
    if (!decision) return { ok: false as const, error: "La decisión no existe." };
    if (decision.estado !== "abierta") {
      return { ok: false as const, error: "La decisión ya no está abierta." };
    }
    const cierre = validarCierre(decision.opciones, opcionElegida, motivo);
    if (!cierre.ok) return { ok: false as const, error: cierre.error };

    await tx.decision.update({
      where: { id: decision.id },
      data: {
        estado: "cerrada",
        opcion_elegida: cierre.opcion,
        motivo: cierre.motivo,
        cerrada_el: ahora,
        dias_abierta: diasEntre(decision.abierta_desde, ahora),
      },
    });
    return { ok: true as const };
  });
}

export type DecisionAbierta = {
  id: string;
  titulo: string;
  opciones: string[];
  bloqueadoPor: string | null;
  diasAbierta: number;
};

export async function decisionesAbiertas(
  db: Db,
  projectId: string,
  ahora: Date = new Date()
): Promise<DecisionAbierta[]> {
  const filas = await db.decision.findMany({
    where: { project_id: projectId, estado: "abierta" },
    orderBy: { abierta_desde: "asc" },
  });
  return filas
    .map((d) => ({
      id: d.id,
      titulo: d.titulo,
      opciones: opcionesComoLista(d.opciones),
      bloqueadoPor: d.bloqueado_por,
      diasAbierta: diasAbierta(
        {
          estado: d.estado as "abierta",
          abierta_desde: d.abierta_desde,
          cerrada_el: d.cerrada_el,
          dias_abierta: d.dias_abierta,
        },
        ahora
      ),
    }))
    .sort((a, b) => b.diasAbierta - a.diasAbierta);
}

// ---------- Consultas de lista y detalle ----------

export type ResumenProyecto = {
  id: string;
  slug: string;
  nombre: string;
  cliente: string | null;
  objetivo: string;
  estado: "activo" | "pausado" | "archivado";
  colorAcento: string;
  tipo: TipoProyecto;
  // Fracción 0..1 del anillo, o null: trazo abierto y discontinuo (H1.4).
  avance: number | null;
  tareasSemanaCompletadas: number;
  tareasSemanaTotales: number;
  resultadoComprometido: string | null;
  tareasAbiertas: number;
  hallazgosSinLeer: number;
  decisionesAbiertas: number;
  ultimaSesion: Date | null;
};

// Datos de la semana en curso para el anillo y el resultado comprometido.
async function datosDeSemana(db: Db, ahora: Date) {
  const inicio = instanteInicioDeSemana(ahora);
  const fin = instanteFinDeSemana(ahora);
  const plan = await db.weeklyPlan.findUnique({
    where: { semana_inicio: inicioDeSemana(ahora) },
    include: { outcomes: true },
  });
  const [pendientes, completadas, sesiones] = await Promise.all([
    db.task.groupBy({
      by: ["project_id"],
      where: { estado: { in: ["semana", "en_curso"] }, project_id: { not: null } },
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ["project_id"],
      where: {
        estado: "hecha",
        completed_at: { gte: inicio, lt: fin },
        project_id: { not: null },
      },
      _count: { _all: true },
    }),
    db.workSession.groupBy({
      by: ["project_id"],
      where: { started_at: { gte: inicio, lt: fin }, duracion_min: { not: null } },
      _sum: { duracion_min: true },
    }),
  ]);
  return { plan, pendientes, completadas, sesiones };
}

function contarPorProyecto(
  grupos: { project_id: string | null; _count: { _all: number } }[]
): Map<string, number> {
  const mapa = new Map<string, number>();
  for (const g of grupos) if (g.project_id) mapa.set(g.project_id, g._count._all);
  return mapa;
}

export async function resumenDeProyectos(
  db: PrismaClient,
  opciones: { archivados?: boolean } = {},
  ahora: Date = new Date()
): Promise<ResumenProyecto[]> {
  const proyectos = await db.project.findMany({
    where: opciones.archivados
      ? { estado: "archivado" }
      : { estado: { in: ["activo", "pausado"] } },
    orderBy: { orden: "asc" },
  });

  const { plan, pendientes, completadas, sesiones } = await datosDeSemana(db, ahora);
  const pendientesPorProyecto = contarPorProyecto(pendientes);
  const completadasPorProyecto = contarPorProyecto(completadas);
  const horasPorProyecto = new Map<string, number>();
  for (const s of sesiones) {
    horasPorProyecto.set(s.project_id, (s._sum.duracion_min ?? 0) / 60);
  }

  const ids = proyectos.map((p) => p.id);
  const [abiertas, sinLeer, decisiones, ultimas] = await Promise.all([
    db.task.groupBy({
      by: ["project_id"],
      where: { project_id: { in: ids }, estado: { in: ["backlog", "semana", "en_curso"] } },
      _count: { _all: true },
    }),
    db.finding.groupBy({
      by: ["project_id"],
      where: { project_id: { in: ids }, estado: "nuevo" },
      _count: { _all: true },
    }),
    db.decision.groupBy({
      by: ["project_id"],
      where: { project_id: { in: ids }, estado: "abierta" },
      _count: { _all: true },
    }),
    db.workSession.groupBy({
      by: ["project_id"],
      where: { project_id: { in: ids } },
      _max: { started_at: true },
    }),
  ]);
  const abiertasPor = contarPorProyecto(abiertas);
  const sinLeerPor = contarPorProyecto(
    sinLeer as { project_id: string | null; _count: { _all: number } }[]
  );
  const decisionesPor = contarPorProyecto(
    decisiones as { project_id: string | null; _count: { _all: number } }[]
  );
  const ultimaPor = new Map<string, Date | null>();
  for (const u of ultimas) ultimaPor.set(u.project_id, u._max.started_at);

  return proyectos.map((p) => {
    const tipo = p.tipo as TipoProyecto;
    const outcome = plan?.outcomes.find((o) => o.project_id === p.id) ?? null;
    const totales =
      (pendientesPorProyecto.get(p.id) ?? 0) + (completadasPorProyecto.get(p.id) ?? 0);
    // Sin resultado comprometido esta semana, el anillo queda abierto
    // (H1.4). Con él, la fracción la decide la rama del tipo de proyecto.
    const avance =
      tipo === "entrega" && !outcome
        ? null
        : cierreDelAnillo({
            tipo,
            tareasSemanaCompletadas: completadasPorProyecto.get(p.id) ?? 0,
            tareasSemanaTotales: totales,
            horasAcumuladas: horasPorProyecto.get(p.id) ?? 0,
            horasObjetivo: p.horas_objetivo,
          });
    return {
      id: p.id,
      slug: p.slug,
      nombre: p.nombre,
      cliente: p.cliente,
      objetivo: p.objetivo,
      estado: p.estado as ResumenProyecto["estado"],
      colorAcento: p.color_acento,
      tipo,
      avance,
      tareasSemanaCompletadas: completadasPorProyecto.get(p.id) ?? 0,
      tareasSemanaTotales: totales,
      resultadoComprometido: outcome?.descripcion ?? null,
      tareasAbiertas: abiertasPor.get(p.id) ?? 0,
      hallazgosSinLeer: sinLeerPor.get(p.id) ?? 0,
      decisionesAbiertas: decisionesPor.get(p.id) ?? 0,
      ultimaSesion: ultimaPor.get(p.id) ?? null,
    };
  });
}

export async function resumenDeProyecto(
  db: PrismaClient,
  slug: string,
  ahora: Date = new Date()
): Promise<ResumenProyecto | null> {
  const p = await db.project.findUnique({ where: { slug } });
  if (!p) return null;
  const todos = await resumenDeProyectos(
    db,
    { archivados: p.estado === "archivado" },
    ahora
  );
  return todos.find((r) => r.slug === slug) ?? null;
}
