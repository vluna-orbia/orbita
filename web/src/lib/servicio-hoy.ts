// Capa de servicio de la pantalla Hoy reducida (encargo suelto, adelanta
// parte de H7.1). Tres consultas: las tareas en curso, las notas de
// cierre de ayer (día civil en Europe/Madrid) y las decisiones abiertas
// por encima del umbral de la regla R6. La sesión activa la sirve
// servicio-sesiones, que ya la lee el layout.
//
// H1.3 aplica al brief diario entero: un proyecto en pausa o archivado no
// aparece en él, así que sus tareas, sesiones y decisiones quedan fuera
// de las tres consultas. Las tareas sin proyecto sí entran.

import type { Prisma } from "@prisma/client";
import { diasAbierta } from "./decisiones";
import { umbralDiasR6, type Db } from "./servicio-proyectos";
import type { TareaDeLista } from "./servicio-tareas";
import type { EstadoTarea } from "./tareas";
import { rangoDeAyer } from "./semana";

// ---------- Sección 1: tareas en curso, las bloqueadas marcadas ----------

// Devuelve las tareas en estado en_curso de proyectos activos o sin
// proyecto, con la misma forma que la vista de tareas: la fila de tarea
// del encargo 4 las pinta tal cual, con el bloqueo en ámbar.
export async function tareasEnCursoDeHoy(db: Db): Promise<TareaDeLista[]> {
  const where: Prisma.TaskWhereInput = {
    estado: "en_curso",
    OR: [{ project_id: null }, { project: { estado: "activo" } }],
  };
  const filas = await db.task.findMany({
    where,
    include: { project: { select: { nombre: true, slug: true, color_acento: true } } },
    orderBy: [
      { vence_el: { sort: "asc", nulls: "last" } },
      { prioridad: { sort: "asc", nulls: "last" } },
      { created_at: "asc" },
    ],
  });
  return filas.map((t) => ({
    id: t.id,
    titulo: t.titulo,
    estado: t.estado as EstadoTarea,
    prioridad: t.prioridad,
    estimacionMin: t.estimacion_min,
    venceEl: t.vence_el,
    siguientePaso: t.siguiente_paso,
    motivoBloqueo: t.motivo_bloqueo,
    proyectoNombre: t.project?.nombre ?? null,
    proyectoSlug: t.project?.slug ?? null,
    colorAcento: t.project?.color_acento ?? null,
    origen: t.origen,
  }));
}

// ---------- Sección 3: notas de cierre de ayer ----------

export type NotaDeAyer = {
  id: string;
  intencion: string;
  proyectoNombre: string;
  colorAcento: string;
  avance: string;
  bloqueo: string | null;
  siguientePaso: string | null;
  duracionMin: number | null;
  abandonada: boolean;
};

// Sesiones terminadas ayer (día civil en Europe/Madrid) que tienen nota.
// Una abandonada cuenta si su nota ya está escrita; una sesión sin nota
// no es una nota de cierre y no aparece.
export async function notasDeAyer(db: Db, ahora: Date = new Date()): Promise<NotaDeAyer[]> {
  const { inicio, fin } = rangoDeAyer(ahora);
  const filas = await db.workSession.findMany({
    where: {
      ended_at: { gte: inicio, lt: fin },
      estado: { in: ["cerrada", "abandonada"] },
      nota_avance: { not: null },
      project: { estado: "activo" },
    },
    include: { project: { select: { nombre: true, color_acento: true } } },
    orderBy: { ended_at: "asc" },
  });
  return filas.map((s) => ({
    id: s.id,
    intencion: s.intencion,
    proyectoNombre: s.project.nombre,
    colorAcento: s.project.color_acento,
    avance: s.nota_avance as string,
    bloqueo: s.nota_bloqueo,
    siguientePaso: s.siguiente_paso,
    duracionMin: s.duracion_min,
    abandonada: s.estado === "abandonada",
  }));
}

// ---------- Sección 4: decisiones por encima del umbral de R6 ----------

export type DecisionSobreUmbral = {
  id: string;
  titulo: string;
  proyectoNombre: string;
  proyectoSlug: string;
  colorAcento: string;
  bloqueadoPor: string | null;
  diasAbierta: number;
};

export type DecisionesDeHoy = {
  umbral: number;
  decisiones: DecisionSobreUmbral[];
};

// Decisiones abiertas que llevan más días que el umbral de R6, con quién
// las bloquea, ordenadas de más antigua a menos. El umbral se lee de la
// última versión del playbook en cada petición; con R6 desactivada no hay
// validación y la sección entera desaparece (se devuelve null).
export async function decisionesSobreUmbral(
  db: Db,
  ahora: Date = new Date()
): Promise<DecisionesDeHoy | null> {
  const umbral = await umbralDiasR6(db);
  if (umbral === null) return null;
  const filas = await db.decision.findMany({
    where: { estado: "abierta", project: { estado: "activo" } },
    include: { project: { select: { nombre: true, slug: true, color_acento: true } } },
  });
  const decisiones = filas
    .map((d) => ({
      id: d.id,
      titulo: d.titulo,
      proyectoNombre: d.project.nombre,
      proyectoSlug: d.project.slug,
      colorAcento: d.project.color_acento,
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
    .filter((d) => d.diasAbierta > umbral)
    .sort((a, b) => b.diasAbierta - a.diasAbierta);
  return { umbral, decisiones };
}
