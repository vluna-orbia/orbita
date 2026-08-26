// Capa de servicio de los rituales semanales (H4.1, H4.2, H4.3): la
// planificación en cuatro pasos con progreso guardado paso a paso, la
// retrospectiva con métricas reales y el aviso de ritual pendiente.
//
// El plan de la semana es una fila única por lunes (WeeklyPlan). El paso
// 1 no permite avanzar con el inbox sin vaciar: es el flujo del asistente
// que fija H4.1, no la validación de R4 (blanda por la DUDA 6), así que
// desactivar R4 no lo relaja. Descartar cuenta como procesado.

import type { PrismaClient } from "@prisma/client";
import { estaBloqueada, puedeTransicionar, type EstadoTarea } from "./tareas";
import { cuentaParaLimiteDeActivos, type TipoProyecto } from "./reglas-proyecto";
import { limiteDeActivos, type Db } from "./servicio-proyectos";
import {
  diaDeLaSemana,
  fechaCivilPura,
  inicioDeSemana,
  rangoDeSemanaPura,
} from "./semana";

const USER_ID = "vluna";

// ---------- El plan de la semana ----------

export type ResultadoComprometido = {
  id: string;
  proyectoSlug: string;
  proyectoNombre: string;
  colorAcento: string;
  descripcion: string;
  cumplido: boolean | null;
};

export type PlanDeLaSemana = {
  id: string;
  semanaInicio: Date;
  proyectosActivos: string[];
  completadoPaso: number;
  resultados: ResultadoComprometido[];
  retroHecha: boolean;
};

// El plan de la semana en curso, con sus resultados comprometidos. Null
// si el ritual no se ha empezado.
export async function planDeLaSemana(
  db: Db,
  ahora: Date = new Date()
): Promise<PlanDeLaSemana | null> {
  const plan = await db.weeklyPlan.findUnique({
    where: { semana_inicio: inicioDeSemana(ahora) },
    include: {
      outcomes: { include: { project: { select: { slug: true, nombre: true, color_acento: true } } } },
      retro: { select: { id: true } },
    },
  });
  if (!plan) return null;
  return {
    id: plan.id,
    semanaInicio: plan.semana_inicio,
    proyectosActivos: (plan.proyectos_activos as string[]) ?? [],
    completadoPaso: plan.completado_paso,
    resultados: plan.outcomes.map((o) => ({
      id: o.id,
      proyectoSlug: o.project.slug,
      proyectoNombre: o.project.nombre,
      colorAcento: o.project.color_acento,
      descripcion: o.descripcion,
      cumplido: o.cumplido,
    })),
    retroHecha: plan.retro !== null,
  };
}

// ---------- Paso 1: triaje del inbox (H4.1) ----------

export const MENSAJE_INBOX_SIN_VACIAR =
  "El inbox tiene que quedar vacío para avanzar. Manda cada elemento a un proyecto o descártalo.";

export type ElementoDelInbox = {
  id: string;
  titulo: string;
  proyectoSlug: string | null;
  capturadaEl: Date;
};

// Todos los elementos del inbox, sin filtrar por estado de proyecto:
// vaciar el inbox es vaciarlo entero.
export async function elementosDelInbox(db: Db): Promise<ElementoDelInbox[]> {
  const filas = await db.task.findMany({
    where: { estado: "inbox" },
    include: { project: { select: { slug: true } } },
    orderBy: { created_at: "asc" },
  });
  return filas.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    proyectoSlug: t.project?.slug ?? null,
    capturadaEl: t.created_at,
  }));
}

export type ResultadoRitual = { ok: true } | { ok: false; error: string };

// Tria un elemento del inbox desde el paso 1: a un proyecto y a backlog
// o semana, o se descarta (descartar cuenta como procesado y no pide
// proyecto). La transición queda marcada con via_ritual: es el numerador
// de la métrica de R4.
export async function triarEnRitual(
  db: PrismaClient,
  tareaId: string,
  triaje: { destino: string; proyectoSlug?: string }
): Promise<ResultadoRitual> {
  const destino = triaje.destino as EstadoTarea;
  if (!["backlog", "semana", "descartada"].includes(destino)) {
    return { ok: false, error: "En el triaje una tarea va a backlog, a semana o se descarta." };
  }
  return db.$transaction(async (tx) => {
    const tarea = await tx.task.findUnique({ where: { id: tareaId } });
    if (!tarea) return { ok: false as const, error: "La tarea no existe." };
    if (tarea.estado !== "inbox") {
      return { ok: false as const, error: "Esa tarea ya no está en el inbox." };
    }
    if (!puedeTransicionar("inbox", destino)) {
      return { ok: false as const, error: "Esa transición no está permitida." };
    }

    let projectId = tarea.project_id;
    if (destino !== "descartada") {
      if (!triaje.proyectoSlug) {
        return { ok: false as const, error: "Elige el proyecto al que va este elemento." };
      }
      const proyecto = await tx.project.findUnique({ where: { slug: triaje.proyectoSlug } });
      if (!proyecto) return { ok: false as const, error: "El proyecto no existe." };
      if (proyecto.estado === "archivado") {
        return { ok: false as const, error: "Un proyecto archivado no admite tareas nuevas." };
      }
      projectId = proyecto.id;
    }

    await tx.task.update({
      where: { id: tarea.id },
      data: { estado: destino, project_id: projectId },
    });
    await tx.taskEvent.create({
      data: {
        user_id: USER_ID,
        task_id: tarea.id,
        estado_anterior: "inbox",
        estado_nuevo: destino,
        via_ritual: true,
      },
    });
    return { ok: true as const };
  });
}

// Avanza del paso 1 al 2. El bloqueo de H4.1: con el inbox sin vaciar no
// se avanza. Crea el plan de la semana si no existe (el progreso se
// guarda paso a paso desde aquí).
export async function avanzarTrasTriaje(
  db: PrismaClient,
  ahora: Date = new Date()
): Promise<ResultadoRitual> {
  const pendientes = await db.task.count({ where: { estado: "inbox" } });
  if (pendientes > 0) return { ok: false, error: MENSAJE_INBOX_SIN_VACIAR };
  const lunes = inicioDeSemana(ahora);
  const plan = await db.weeklyPlan.findUnique({ where: { semana_inicio: lunes } });
  if (!plan) {
    await db.weeklyPlan.create({
      data: {
        user_id: USER_ID,
        semana_inicio: lunes,
        proyectos_activos: [],
        completado_paso: 1,
      },
    });
  } else if (plan.completado_paso < 1) {
    await db.weeklyPlan.update({ where: { id: plan.id }, data: { completado_paso: 1 } });
  }
  return { ok: true };
}

// ---------- Paso 2: proyectos activos (H4.1) ----------

export type ProyectoElegible = {
  slug: string;
  nombre: string;
  cliente: string | null;
  colorAcento: string;
  estado: "activo" | "pausado";
  tipo: TipoProyecto;
  cuentaParaLimite: boolean;
};

// Proyectos entre los que se elige en el paso 2: los no archivados. Los
// continuos no consumen plaza del límite (adenda 05).
export async function proyectosElegibles(db: Db): Promise<ProyectoElegible[]> {
  const filas = await db.project.findMany({
    where: { estado: { in: ["activo", "pausado"] } },
    orderBy: { orden: "asc" },
  });
  return filas.map((p) => ({
    slug: p.slug,
    nombre: p.nombre,
    cliente: p.cliente,
    colorAcento: p.color_acento,
    estado: p.estado as "activo" | "pausado",
    tipo: p.tipo as TipoProyecto,
    cuentaParaLimite: cuentaParaLimiteDeActivos(p.tipo as TipoProyecto),
  }));
}

export function mensajeLimiteDelPaso2(limite: number): string {
  return `La regla R2 admite ${limite} proyectos activos como máximo. Deja fuera alguno.`;
}

// Guarda la selección del paso 2: los elegidos pasan a activos y el
// resto de los no archivados a pausa, en la misma transacción. El límite
// se lee de parametros.limite de R2; con R2 desactivada no hay tope.
export async function guardarProyectosActivos(
  db: PrismaClient,
  slugs: string[],
  ahora: Date = new Date()
): Promise<ResultadoRitual> {
  return db.$transaction(async (tx) => {
    const lunes = inicioDeSemana(ahora);
    const plan = await tx.weeklyPlan.findUnique({ where: { semana_inicio: lunes } });
    if (!plan || plan.completado_paso < 1) {
      return { ok: false as const, error: "El triaje del inbox va primero. Vuelve al paso 1." };
    }

    const candidatos = await tx.project.findMany({
      where: { estado: { in: ["activo", "pausado"] } },
      orderBy: { orden: "asc" },
    });
    const elegidos = candidatos.filter((p) => slugs.includes(p.slug));
    if (elegidos.length !== new Set(slugs).size) {
      return { ok: false as const, error: "Alguno de los proyectos elegidos no existe." };
    }

    const limite = await limiteDeActivos(tx);
    const queCuentan = elegidos.filter((p) =>
      cuentaParaLimiteDeActivos(p.tipo as TipoProyecto)
    ).length;
    if (limite !== null && queCuentan > limite) {
      return { ok: false as const, error: mensajeLimiteDelPaso2(limite) };
    }

    for (const proyecto of candidatos) {
      const destino = slugs.includes(proyecto.slug) ? "activo" : "pausado";
      if (proyecto.estado !== destino) {
        await tx.project.update({ where: { id: proyecto.id }, data: { estado: destino } });
      }
    }

    const ordenados = candidatos.filter((p) => slugs.includes(p.slug)).map((p) => p.slug);
    await tx.weeklyPlan.update({
      where: { id: plan.id },
      data: {
        proyectos_activos: ordenados,
        completado_paso: Math.max(2, plan.completado_paso),
      },
    });
    return { ok: true as const };
  });
}

// ---------- Paso 3: resultado de la semana (H4.1) ----------

// Guarda una frase por proyecto activo, verificable con un sí o un no.
// En modo edición conserva el cumplido ya marcado y retira los resultados
// de proyectos que dejaron de estar activos.
export async function guardarResultados(
  db: PrismaClient,
  resultados: { slug: string; descripcion: string }[],
  ahora: Date = new Date()
): Promise<ResultadoRitual> {
  return db.$transaction(async (tx) => {
    const lunes = inicioDeSemana(ahora);
    const plan = await tx.weeklyPlan.findUnique({
      where: { semana_inicio: lunes },
      include: { outcomes: true },
    });
    if (!plan || plan.completado_paso < 2) {
      return { ok: false as const, error: "Elige antes los proyectos activos del paso 2." };
    }
    const activos = (plan.proyectos_activos as string[]) ?? [];
    const porSlug = new Map(resultados.map((r) => [r.slug, r.descripcion.trim()]));
    for (const slug of activos) {
      if (!porSlug.get(slug)) {
        return {
          ok: false as const,
          error: "Cada proyecto activo necesita su resultado de la semana. Una frase basta.",
        };
      }
    }

    const proyectos = await tx.project.findMany({
      where: { slug: { in: activos } },
      select: { id: true, slug: true },
    });
    const idPorSlug = new Map(proyectos.map((p) => [p.slug, p.id]));

    // Retira los resultados de proyectos fuera del plan actual.
    for (const outcome of plan.outcomes) {
      const proyectoSigue = proyectos.some((p) => p.id === outcome.project_id);
      if (!proyectoSigue) {
        await tx.weeklyOutcome.delete({ where: { id: outcome.id } });
      }
    }
    for (const slug of activos) {
      const projectId = idPorSlug.get(slug);
      if (!projectId) continue;
      const existente = plan.outcomes.find((o) => o.project_id === projectId);
      const descripcion = porSlug.get(slug) as string;
      if (existente) {
        await tx.weeklyOutcome.update({
          where: { id: existente.id },
          data: { descripcion },
        });
      } else {
        await tx.weeklyOutcome.create({
          data: {
            user_id: USER_ID,
            weekly_plan_id: plan.id,
            project_id: projectId,
            descripcion,
            cumplido: null,
          },
        });
      }
    }
    await tx.weeklyPlan.update({
      where: { id: plan.id },
      data: { completado_paso: Math.max(3, plan.completado_paso) },
    });
    return { ok: true as const };
  });
}

// ---------- Paso 4: tareas de la semana (H4.1) ----------

export type TareaDelPaso4 = {
  id: string;
  titulo: string;
  estado: "backlog" | "semana";
  bloqueada: boolean;
  siguientePaso: string | null;
};

export type ProyectoDelPaso4 = {
  slug: string;
  nombre: string;
  colorAcento: string;
  tareas: TareaDelPaso4[];
};

// El backlog y la semana de cada proyecto activo del plan: lo marcado
// queda en semana, lo desmarcado vuelve al backlog.
export async function tareasParaPaso4(db: Db, ahora: Date = new Date()): Promise<ProyectoDelPaso4[]> {
  const plan = await db.weeklyPlan.findUnique({ where: { semana_inicio: inicioDeSemana(ahora) } });
  const activos = ((plan?.proyectos_activos as string[]) ?? []).filter(Boolean);
  if (activos.length === 0) return [];
  const proyectos = await db.project.findMany({
    where: { slug: { in: activos } },
    include: {
      tasks: {
        where: { estado: { in: ["backlog", "semana"] } },
        orderBy: [{ prioridad: { sort: "asc", nulls: "last" } }, { created_at: "asc" }],
      },
    },
    orderBy: { orden: "asc" },
  });
  return proyectos.map((p) => ({
    slug: p.slug,
    nombre: p.nombre,
    colorAcento: p.color_acento,
    tareas: p.tasks.map((t) => ({
      id: t.id,
      titulo: t.titulo,
      estado: t.estado as "backlog" | "semana",
      bloqueada: estaBloqueada(t),
      siguientePaso: t.siguiente_paso,
    })),
  }));
}

// Aplica la selección del paso 4 y deja el ritual completado. Solo mueve
// entre backlog y semana dentro de los proyectos activos del plan; las
// tareas en curso no se tocan.
export async function guardarTareasDeLaSemana(
  db: PrismaClient,
  seleccion: string[],
  ahora: Date = new Date()
): Promise<ResultadoRitual> {
  return db.$transaction(async (tx) => {
    const plan = await tx.weeklyPlan.findUnique({ where: { semana_inicio: inicioDeSemana(ahora) } });
    if (!plan || plan.completado_paso < 3) {
      return { ok: false as const, error: "Escribe antes los resultados del paso 3." };
    }
    const activos = (plan.proyectos_activos as string[]) ?? [];
    const tareas = await tx.task.findMany({
      where: { estado: { in: ["backlog", "semana"] }, project: { slug: { in: activos } } },
    });
    for (const tarea of tareas) {
      const destino = seleccion.includes(tarea.id) ? "semana" : "backlog";
      if (tarea.estado === destino) continue;
      await tx.task.update({ where: { id: tarea.id }, data: { estado: destino } });
      await tx.taskEvent.create({
        data: {
          user_id: USER_ID,
          task_id: tarea.id,
          estado_anterior: tarea.estado,
          estado_nuevo: destino,
          via_ritual: true,
        },
      });
    }
    await tx.weeklyPlan.update({
      where: { id: plan.id },
      data: { completado_paso: Math.max(4, plan.completado_paso) },
    });
    return { ok: true as const };
  });
}

// ---------- Retrospectiva (H4.2) ----------

export type MetricasDeLaSemana = {
  tareasCompletadas: number;
  sesiones: number;
  minutos: number;
  porcentajeConNota: number;
  intentosDeSaltarWip: number;
};

// Las métricas de la semana en curso, calculadas de los datos, no
// simuladas. Las sesiones se agrupan por su arranque, como en H3.4.
export async function metricasDeLaSemana(
  db: Db,
  ahora: Date = new Date()
): Promise<MetricasDeLaSemana> {
  const rango = rangoDeSemanaPura(inicioDeSemana(ahora));
  const filtroFecha = { gte: rango.inicio, lt: rango.fin };
  const [completadas, sesiones, rechazos] = await Promise.all([
    db.task.count({ where: { estado: "hecha", completed_at: filtroFecha } }),
    db.workSession.findMany({
      where: { started_at: filtroFecha },
      select: { estado: true, duracion_min: true, nota_avance: true, siguiente_paso: true },
    }),
    db.wipRejection.count({ where: { created_at: filtroFecha } }),
  ]);
  const terminadas = sesiones.filter((s) => s.estado !== "activa");
  const conNota = terminadas.filter(
    (s) => s.estado === "cerrada" && s.nota_avance && s.siguiente_paso
  ).length;
  return {
    tareasCompletadas: completadas,
    sesiones: sesiones.length,
    minutos: sesiones.reduce((total, s) => total + (s.duracion_min ?? 0), 0),
    porcentajeConNota:
      terminadas.length === 0 ? 0 : Math.round((conNota / terminadas.length) * 100),
    intentosDeSaltarWip: rechazos,
  };
}

// Marca un resultado comprometido como cumplido o no cumplido, sin
// opción intermedia.
export async function marcarResultado(
  db: PrismaClient,
  outcomeId: string,
  cumplido: boolean
): Promise<ResultadoRitual> {
  const outcome = await db.weeklyOutcome.findUnique({ where: { id: outcomeId } });
  if (!outcome) return { ok: false, error: "Ese resultado no existe." };
  await db.weeklyOutcome.update({ where: { id: outcomeId }, data: { cumplido } });
  return { ok: true };
}

export type CamposRetro = { queFunciono: string; queNo: string; quePruebo: string };

// Guarda la retrospectiva de la semana (una por semana: weekly_plan_id es
// único). Congela en metricas la foto de las métricas al guardar.
export async function guardarRetro(
  db: PrismaClient,
  campos: CamposRetro,
  ahora: Date = new Date()
): Promise<ResultadoRitual> {
  const plan = await db.weeklyPlan.findUnique({
    where: { semana_inicio: inicioDeSemana(ahora) },
    include: { retro: true },
  });
  if (!plan) {
    return {
      ok: false,
      error: "Esta semana no tiene planificación. La retro necesita algo que revisar.",
    };
  }
  const metricas = await metricasDeLaSemana(db, ahora);
  const datos = {
    que_funciono: campos.queFunciono.trim() || null,
    que_no: campos.queNo.trim() || null,
    que_pruebo: campos.quePruebo.trim() || null,
    metricas: metricas as unknown as import("@prisma/client").Prisma.InputJsonValue,
  };
  if (plan.retro) {
    await db.retro.update({ where: { id: plan.retro.id }, data: datos });
  } else {
    await db.retro.create({
      data: { user_id: USER_ID, weekly_plan_id: plan.id, ...datos },
    });
  }
  return { ok: true };
}

// Convierte el "qué cambio pruebo" de la retro guardada en una regla
// propia del Playbook (H4.2): crea versión nueva con la regla añadida en
// la categoría revisión (nace del ritual de revisión; decisión en DUDAS).
export async function convertirCambioEnRegla(
  db: PrismaClient,
  ahora: Date = new Date()
): Promise<ResultadoRitual> {
  const plan = await db.weeklyPlan.findUnique({
    where: { semana_inicio: inicioDeSemana(ahora) },
    include: { retro: true },
  });
  if (!plan?.retro?.que_pruebo?.trim()) {
    return { ok: false, error: "Guarda antes la retro con algo en qué cambio pruebo." };
  }
  const { crearVersionConCambio } = await import("./servicio-playbook");
  const fecha = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  }).format(plan.semana_inicio);
  const resultado = await crearVersionConCambio(
    db,
    { tipo: "anadir", texto: plan.retro.que_pruebo.trim(), categoria: "revisión" },
    `Regla nacida de la retrospectiva de la semana del ${fecha}`,
    ahora
  );
  if (!resultado.ok) return { ok: false, error: resultado.error };
  return { ok: true };
}

// ---------- Aviso de ritual pendiente (H4.3) ----------

export type AvisoDeRitual = { tipo: "plan" | "retro"; atenuar: boolean };

// Lunes sin planificación completada: aviso y el resto atenuado hasta
// hacerla o posponerla. Viernes con la retro pendiente: aviso sin
// atenuar. Posponer silencia el aviso durante el día civil en curso.
export async function avisoDeRitual(
  db: Db,
  ahora: Date = new Date()
): Promise<AvisoDeRitual | null> {
  const dia = diaDeLaSemana(ahora);
  if (dia !== 0 && dia !== 4) return null;
  const tipo = dia === 0 ? "plan" : "retro";
  const pospuesto = await db.ritualSnooze.findUnique({
    where: { tipo_fecha: { tipo, fecha: fechaCivilPura(ahora) } },
  });
  if (pospuesto) return null;

  const plan = await db.weeklyPlan.findUnique({
    where: { semana_inicio: inicioDeSemana(ahora) },
    include: { retro: { select: { id: true } } },
  });
  if (tipo === "plan") {
    if (!plan || plan.completado_paso < 4) return { tipo: "plan", atenuar: true };
    return null;
  }
  if (plan && plan.completado_paso >= 4 && !plan.retro) {
    return { tipo: "retro", atenuar: false };
  }
  return null;
}

// Posponer explícitamente el aviso del día (H4.3).
export async function posponerRitual(
  db: PrismaClient,
  tipo: "plan" | "retro",
  ahora: Date = new Date()
): Promise<void> {
  const fecha = fechaCivilPura(ahora);
  await db.ritualSnooze.upsert({
    where: { tipo_fecha: { tipo, fecha } },
    create: { user_id: USER_ID, tipo, fecha },
    update: {},
  });
}
