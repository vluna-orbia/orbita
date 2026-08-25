// Capa de servicio de sesiones (H3.1 a H3.4): una sola sesión activa,
// cronómetro calculado desde started_at en el servidor, cierre con nota
// obligatoria mientras R3 esté activa, detección perezosa de huérfanas y
// el historial por proyecto y semana.

import type { PrismaClient } from "@prisma/client";
import {
  duracionMinutos,
  esHuerfana,
  MENSAJE_SESION_ACTIVA,
  ultimaActividad,
  validarArranque,
  validarNotaDeCierre,
  type NotaDeCierre,
} from "./sesiones";
import { inicioDeSemana } from "./semana";
import type { Db } from "./servicio-proyectos";

const USER_ID = "vluna";

// ---------- Regla R3 del playbook ----------

export async function r3Activa(db: Db): Promise<boolean> {
  const regla = await db.playbookRule.findFirst({
    where: { clave: "R3", retirada_el: null },
    orderBy: { playbook: { version: "desc" } },
  });
  return regla?.activa ?? false;
}

// ---------- Sesión activa y huérfanas (H3.1, H3.3) ----------

export type SesionActiva = {
  id: string;
  intencion: string;
  startedAt: Date;
  proyectoNombre: string;
  proyectoSlug: string;
  colorAcento: string;
  tareaId: string | null;
  tareaTitulo: string | null;
};

// Devuelve la sesión activa. Detección perezosa de huérfanas: si lleva
// más de 4 horas sin actividad conocida, aquí mismo pasa a abandonada con
// la duración hasta el último latido, y se pedirá la nota al entrar.
export async function sesionActiva(
  db: PrismaClient,
  ahora: Date = new Date()
): Promise<SesionActiva | null> {
  const sesion = await db.workSession.findFirst({
    where: { estado: "activa" },
    include: { project: { select: { nombre: true, slug: true, color_acento: true } } },
    orderBy: { started_at: "desc" },
  });
  if (!sesion) return null;
  if (esHuerfana(sesion, ahora)) {
    const fin = ultimaActividad(sesion);
    await db.workSession.update({
      where: { id: sesion.id },
      data: {
        estado: "abandonada",
        ended_at: fin,
        duracion_min: duracionMinutos(sesion.started_at, fin),
      },
    });
    return null;
  }
  let tareaTitulo: string | null = null;
  if (sesion.task_id) {
    const tarea = await db.task.findUnique({
      where: { id: sesion.task_id },
      select: { titulo: true },
    });
    tareaTitulo = tarea?.titulo ?? null;
  }
  return {
    id: sesion.id,
    intencion: sesion.intencion,
    startedAt: sesion.started_at,
    proyectoNombre: sesion.project.nombre,
    proyectoSlug: sesion.project.slug,
    colorAcento: sesion.project.color_acento,
    tareaId: sesion.task_id,
    tareaTitulo,
  };
}

export type SesionPendienteDeNota = {
  id: string;
  intencion: string;
  proyectoNombre: string;
  startedAt: Date;
  duracionMin: number | null;
};

// Sesiones abandonadas a las que falta la nota de cierre: se piden la
// próxima vez que el usuario entra (H3.3).
export async function sesionesPendientesDeNota(
  db: PrismaClient
): Promise<SesionPendienteDeNota[]> {
  const filas = await db.workSession.findMany({
    where: { estado: "abandonada", nota_avance: null },
    include: { project: { select: { nombre: true } } },
    orderBy: { started_at: "asc" },
  });
  return filas.map((s) => ({
    id: s.id,
    intencion: s.intencion,
    proyectoNombre: s.project.nombre,
    startedAt: s.started_at,
    duracionMin: s.duracion_min,
  }));
}

// ---------- Arranque (H3.1) ----------

export type ResultadoEmpezar = { ok: true; sesionId: string } | { ok: false; error: string };

export async function empezarSesion(
  db: PrismaClient,
  datos: { proyectoSlug: string; intencion: string; tareaId?: string | null },
  ahora: Date = new Date()
): Promise<ResultadoEmpezar> {
  const validacion = validarArranque({ intencion: datos.intencion });
  if (!validacion.ok) return { ok: false, error: validacion.error };

  return db.$transaction(async (tx) => {
    // Una sola sesión activa a la vez. Si la que hay es huérfana, se
    // abandona aquí mismo y el arranque continúa.
    const activa = await tx.workSession.findFirst({ where: { estado: "activa" } });
    if (activa) {
      if (esHuerfana(activa, ahora)) {
        const fin = ultimaActividad(activa);
        await tx.workSession.update({
          where: { id: activa.id },
          data: {
            estado: "abandonada",
            ended_at: fin,
            duracion_min: duracionMinutos(activa.started_at, fin),
          },
        });
      } else {
        return { ok: false as const, error: MENSAJE_SESION_ACTIVA };
      }
    }

    const proyecto = await tx.project.findUnique({ where: { slug: datos.proyectoSlug } });
    if (!proyecto) return { ok: false as const, error: "El proyecto no existe." };
    if (proyecto.estado === "archivado") {
      return { ok: false as const, error: "Un proyecto archivado no admite sesiones. Recupéralo primero." };
    }

    let tareaId: string | null = null;
    if (datos.tareaId) {
      const tarea = await tx.task.findUnique({ where: { id: datos.tareaId } });
      if (!tarea) return { ok: false as const, error: "La tarea vinculada no existe." };
      if (tarea.project_id !== proyecto.id) {
        return { ok: false as const, error: "La tarea vinculada es de otro proyecto." };
      }
      tareaId = tarea.id;
    }

    const sesion = await tx.workSession.create({
      data: {
        user_id: USER_ID,
        project_id: proyecto.id,
        task_id: tareaId,
        intencion: validacion.intencion,
        started_at: ahora,
        estado: "activa",
      },
    });
    return { ok: true as const, sesionId: sesion.id };
  });
}

// ---------- Latido del cronómetro ----------

// El cronómetro abierto avisa cada pocos minutos: updated_at queda como
// última actividad conocida para la detección de huérfanas. No devuelve
// nada y no revalida rutas: es contabilidad, no interfaz.
export async function latidoDeSesion(db: PrismaClient, sesionId: string): Promise<void> {
  await db.workSession.updateMany({
    where: { id: sesionId, estado: "activa" },
    data: { updated_at: new Date() },
  });
}

// ---------- Cierre (H3.2) ----------

export type ResultadoCierre = { ok: true; duracionMin: number } | { ok: false; error: string };

// Cierra la sesión con la nota. La duración se calcula desde started_at
// en el servidor: cerrar el navegador no pierde tiempo ni lo inventa. El
// siguiente paso de la nota se copia a la tarea vinculada, si la hay.
export async function cerrarSesion(
  db: PrismaClient,
  sesionId: string,
  nota: NotaDeCierre,
  ahora: Date = new Date()
): Promise<ResultadoCierre> {
  const r3 = await r3Activa(db);
  const validacion = validarNotaDeCierre(nota, r3);
  if (!validacion.ok) return { ok: false, error: validacion.error };

  return db.$transaction(async (tx) => {
    const sesion = await tx.workSession.findUnique({ where: { id: sesionId } });
    if (!sesion) return { ok: false as const, error: "La sesión no existe." };
    if (sesion.estado === "cerrada") {
      return { ok: false as const, error: "La sesión ya está cerrada." };
    }

    // Una abandonada conserva su duración congelada; una activa se cierra
    // ahora y la duración sale de started_at.
    const esAbandonada = sesion.estado === "abandonada";
    const fin = esAbandonada ? sesion.ended_at ?? ultimaActividad(sesion) : ahora;
    const duracion = esAbandonada
      ? sesion.duracion_min ?? duracionMinutos(sesion.started_at, fin)
      : duracionMinutos(sesion.started_at, fin);

    await tx.workSession.update({
      where: { id: sesion.id },
      data: {
        estado: esAbandonada ? "abandonada" : "cerrada",
        ended_at: fin,
        duracion_min: duracion,
        nota_avance: validacion.nota.avance,
        nota_bloqueo: validacion.nota.bloqueo,
        siguiente_paso: validacion.nota.siguientePaso,
      },
    });

    if (sesion.task_id && validacion.nota.siguientePaso) {
      await tx.task.update({
        where: { id: sesion.task_id },
        data: { siguiente_paso: validacion.nota.siguientePaso },
      });
    }
    return { ok: true as const, duracionMin: duracion };
  });
}

// ---------- Historial (H3.4) ----------

export type SemanaDeSesiones = {
  semanaInicio: Date;
  sesiones: number;
  minutos: number;
  porcentajeConNota: number;
};

// Historial por proyecto y por semana: número de sesiones, minutos
// totales y porcentaje con nota de cierre. Las semanas se calculan en
// Europe/Madrid, como todo.
export async function historialDeSesiones(
  db: Db,
  projectId: string,
  limiteSemanas = 8
): Promise<SemanaDeSesiones[]> {
  const filas = await db.workSession.findMany({
    where: { project_id: projectId, estado: { in: ["cerrada", "abandonada"] } },
    select: { started_at: true, duracion_min: true, nota_avance: true, siguiente_paso: true },
    orderBy: { started_at: "desc" },
  });
  const porSemana = new Map<number, { sesiones: number; minutos: number; conNota: number }>();
  for (const s of filas) {
    const clave = inicioDeSemana(s.started_at).getTime();
    const grupo = porSemana.get(clave) ?? { sesiones: 0, minutos: 0, conNota: 0 };
    grupo.sesiones += 1;
    grupo.minutos += s.duracion_min ?? 0;
    if (s.nota_avance && s.siguiente_paso) grupo.conNota += 1;
    porSemana.set(clave, grupo);
  }
  return [...porSemana.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, limiteSemanas)
    .map(([inicio, g]) => ({
      semanaInicio: new Date(inicio),
      sesiones: g.sesiones,
      minutos: g.minutos,
      porcentajeConNota: g.sesiones === 0 ? 0 : Math.round((g.conNota / g.sesiones) * 100),
    }));
}
