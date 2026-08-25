// Capa de servicio de tareas (H2.1 a H2.6): captura, máquina de estados
// con registro de transiciones, límite de WIP ligado a la regla R1 del
// playbook y bloqueos. Las server actions son envoltorios finos sobre
// estas funciones: llamar aquí directamente es llamar a la API, y la
// validación no se puede saltar desde el cliente.

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  esEstadoTarea,
  estaBloqueada,
  interpretarCaptura,
  mensajeLimiteWip,
  mensajeTransicionInvalida,
  puedeTransicionar,
  validarBloqueo,
  type EstadoTarea,
} from "./tareas";
import { tareasCuentanParaWip, type TipoProyecto } from "./reglas-proyecto";
import type { Db } from "./servicio-proyectos";

const USER_ID = "vluna";

// ---------- Regla R1 del playbook ----------

// Límite de tareas en curso (R1). Se lee de la última versión del
// playbook: regla desactivada, validación desactivada; activa, el límite
// vive en parametros.limite con 3 por defecto.
export async function limiteWip(db: Db): Promise<number | null> {
  const regla = await db.playbookRule.findFirst({
    where: { clave: "R1", retirada_el: null },
    orderBy: { playbook: { version: "desc" } },
  });
  if (!regla || !regla.activa) return null;
  const parametros = regla.parametros as { limite?: number } | null;
  return parametros?.limite ?? 3;
}

export type TareaEnCurso = {
  id: string;
  titulo: string;
  proyectoNombre: string | null;
  proyectoSlug: string | null;
  colorAcento: string | null;
  siguientePaso: string | null;
};

// Las tareas en curso que ocupan plaza del límite de WIP: las bloqueadas
// no cuentan (H2.5) y las de proyectos en pausa o archivados tampoco
// (H1.3). Las ramas por tipo de proyecto vienen de reglas-proyecto.
export async function tareasEnCursoQueCuentan(db: Db): Promise<TareaEnCurso[]> {
  const filas = await db.task.findMany({
    where: { estado: "en_curso" },
    include: { project: { select: { nombre: true, slug: true, estado: true, tipo: true, color_acento: true } } },
    orderBy: { updated_at: "asc" },
  });
  return filas
    .filter((t) => !estaBloqueada(t))
    .filter((t) => !t.project || t.project.estado === "activo")
    .filter((t) => !t.project || tareasCuentanParaWip(t.project.tipo as TipoProyecto))
    .map((t) => ({
      id: t.id,
      titulo: t.titulo,
      proyectoNombre: t.project?.nombre ?? null,
      proyectoSlug: t.project?.slug ?? null,
      colorAcento: t.project?.color_acento ?? null,
      siguientePaso: t.siguiente_paso,
    }));
}

// ---------- Captura (H2.1) ----------

export type ResultadoCaptura =
  | { ok: true; tareaId: string; proyectoAsignado: string | null }
  | { ok: false; error: string };

// Crea una tarea en inbox desde el campo de captura. El proyecto puede
// venir en línea con @nombre; nunca es obligatorio. Registra el evento de
// creación en el log (H2.2).
export async function capturarTarea(db: PrismaClient, texto: string): Promise<ResultadoCaptura> {
  const proyectos = await db.project.findMany({
    where: { estado: { in: ["activo", "pausado"] } },
    select: { id: true, nombre: true, slug: true },
    orderBy: { orden: "asc" },
  });
  const captura = interpretarCaptura(texto, proyectos);
  if ("error" in captura) return { ok: false, error: captura.error };

  const tarea = await db.$transaction(async (tx) => {
    const creada = await tx.task.create({
      data: {
        user_id: USER_ID,
        project_id: captura.proyectoId,
        titulo: captura.titulo,
        estado: "inbox",
        origen: "manual",
      },
    });
    await tx.taskEvent.create({
      data: {
        user_id: USER_ID,
        task_id: creada.id,
        estado_anterior: null,
        estado_nuevo: "inbox",
      },
    });
    return creada;
  });

  const proyecto = captura.proyectoId
    ? proyectos.find((p) => p.id === captura.proyectoId)?.nombre ?? null
    : null;
  return { ok: true, tareaId: tarea.id, proyectoAsignado: proyecto };
}

// ---------- Máquina de estados (H2.2, H2.3, H2.4) ----------

export type ResultadoTransicion =
  | { ok: true }
  | { ok: false; error: string; limiteWip?: TareaEnCurso[]; pideSiguientePaso?: boolean };

// Cambia el estado de una tarea aplicando la máquina de estados, el
// límite de WIP (R1) y el siguiente paso obligatorio al volver de
// en_curso a semana (H2.4). Todo dentro de una transacción: el intento de
// saltarse el límite llamando directamente a la API acaba aquí igual.
export async function cambiarEstadoTarea(
  db: PrismaClient,
  tareaId: string,
  destino: string,
  opciones: { siguientePaso?: string } = {},
  ahora: Date = new Date()
): Promise<ResultadoTransicion> {
  if (!esEstadoTarea(destino)) {
    return { ok: false, error: "Ese estado no existe." };
  }
  return db.$transaction(async (tx) => {
    const tarea = await tx.task.findUnique({
      where: { id: tareaId },
      include: { project: { select: { estado: true, tipo: true } } },
    });
    if (!tarea) return { ok: false as const, error: "La tarea no existe." };
    const desde = tarea.estado as EstadoTarea;
    if (desde === destino) return { ok: true as const };
    if (!puedeTransicionar(desde, destino)) {
      return { ok: false as const, error: mensajeTransicionInvalida(desde, destino) };
    }

    // R1: entrar a en_curso ocupa plaza salvo que la tarea esté bloqueada
    // o su proyecto no esté activo. El límite se lee del playbook.
    if (destino === "en_curso") {
      const ocupaPlaza =
        !estaBloqueada(tarea) &&
        (!tarea.project ||
          (tarea.project.estado === "activo" &&
            tareasCuentanParaWip(tarea.project.tipo as TipoProyecto)));
      if (ocupaPlaza) {
        const limite = await limiteWip(tx);
        if (limite !== null) {
          const enCurso = await tareasEnCursoQueCuentan(tx);
          if (enCurso.length >= limite) {
            return {
              ok: false as const,
              error: mensajeLimiteWip(limite),
              limiteWip: enCurso,
            };
          }
        }
      }
    }

    // H2.4: volver de en_curso a semana exige siguiente paso.
    let siguientePaso = tarea.siguiente_paso;
    if (opciones.siguientePaso !== undefined && opciones.siguientePaso.trim() !== "") {
      siguientePaso = opciones.siguientePaso.trim();
    }
    if (desde === "en_curso" && destino === "semana" && !siguientePaso) {
      return {
        ok: false as const,
        error: "Antes de devolverla a la semana, escribe el siguiente paso: es lo que te ahorra el arranque en frío.",
        pideSiguientePaso: true,
      };
    }

    await tx.task.update({
      where: { id: tarea.id },
      data: {
        estado: destino,
        siguiente_paso: siguientePaso,
        completed_at: destino === "hecha" ? ahora : tarea.completed_at,
      },
    });
    await tx.taskEvent.create({
      data: {
        user_id: USER_ID,
        task_id: tarea.id,
        estado_anterior: desde,
        estado_nuevo: destino,
      },
    });
    return { ok: true as const };
  });
}

// ---------- Bloqueos (H2.5) ----------

export type ResultadoSimpleTarea = { ok: true } | { ok: false; error: string };

export async function bloquearTarea(
  db: PrismaClient,
  tareaId: string,
  motivo: string,
  bloqueadaPorId?: string | null
): Promise<ResultadoSimpleTarea> {
  const validacion = validarBloqueo(motivo);
  if (!validacion.ok) return { ok: false, error: validacion.error };
  return db.$transaction(async (tx) => {
    const tarea = await tx.task.findUnique({ where: { id: tareaId } });
    if (!tarea) return { ok: false as const, error: "La tarea no existe." };
    if (tarea.estado === "hecha" || tarea.estado === "descartada") {
      return { ok: false as const, error: "Una tarea terminada no se puede bloquear." };
    }
    if (bloqueadaPorId) {
      if (bloqueadaPorId === tareaId) {
        return { ok: false as const, error: "Una tarea no puede bloquearse a sí misma." };
      }
      const bloqueante = await tx.task.findUnique({ where: { id: bloqueadaPorId } });
      if (!bloqueante) return { ok: false as const, error: "La tarea bloqueante no existe." };
    }
    await tx.task.update({
      where: { id: tareaId },
      data: { motivo_bloqueo: validacion.motivo, bloqueada_por: bloqueadaPorId ?? null },
    });
    return { ok: true as const };
  });
}

export async function desbloquearTarea(
  db: PrismaClient,
  tareaId: string
): Promise<ResultadoSimpleTarea> {
  const tarea = await db.task.findUnique({ where: { id: tareaId } });
  if (!tarea) return { ok: false, error: "La tarea no existe." };
  await db.task.update({
    where: { id: tareaId },
    data: { motivo_bloqueo: null, bloqueada_por: null },
  });
  return { ok: true };
}

// ---------- Edición de campos (detalle) ----------

export type CamposTarea = {
  titulo: string;
  notas: string;
  proyectoSlug: string;
  prioridad: string;
  estimacionMin: string;
  venceEl: string;
  siguientePaso: string;
};

export async function actualizarTarea(
  db: PrismaClient,
  tareaId: string,
  campos: CamposTarea
): Promise<ResultadoSimpleTarea> {
  const titulo = campos.titulo.trim();
  if (!titulo) return { ok: false, error: "La tarea necesita un título." };

  let projectId: string | null = null;
  if (campos.proyectoSlug) {
    const proyecto = await db.project.findUnique({ where: { slug: campos.proyectoSlug } });
    if (!proyecto) return { ok: false, error: "El proyecto no existe." };
    projectId = proyecto.id;
  }

  const prioridad = campos.prioridad === "" ? null : Number(campos.prioridad);
  if (prioridad !== null && (!Number.isInteger(prioridad) || prioridad < 1 || prioridad > 3)) {
    return { ok: false, error: "La prioridad va de 1 (alta) a 3 (baja), o se deja vacía." };
  }
  const estimacion = campos.estimacionMin === "" ? null : Number(campos.estimacionMin);
  if (estimacion !== null && (!Number.isInteger(estimacion) || estimacion <= 0)) {
    return { ok: false, error: "La estimación son minutos enteros, o se deja vacía." };
  }
  let venceEl: Date | null = null;
  if (campos.venceEl) {
    // Fecha civil en Europe/Madrid: se guarda la medianoche UTC del día.
    const fecha = new Date(campos.venceEl + "T00:00:00Z");
    if (Number.isNaN(fecha.getTime())) {
      return { ok: false, error: "La fecha de vencimiento no es válida." };
    }
    venceEl = fecha;
  }

  const tarea = await db.task.findUnique({ where: { id: tareaId } });
  if (!tarea) return { ok: false, error: "La tarea no existe." };

  await db.task.update({
    where: { id: tareaId },
    data: {
      titulo,
      notas: campos.notas.trim() || null,
      project_id: projectId,
      prioridad,
      estimacion_min: estimacion,
      vence_el: venceEl,
      siguiente_paso: campos.siguientePaso.trim() || null,
    },
  });
  return { ok: true };
}

// ---------- Vista filtrable (H2.6) ----------

export const FILTROS_VENCIMIENTO = ["todas", "vencidas", "proximos-7"] as const;
export type FiltroVencimiento = (typeof FILTROS_VENCIMIENTO)[number];

export type FiltrosDeTareas = {
  proyecto?: string; // slug, o "sin-proyecto"
  estado?: EstadoTarea;
  vencimiento?: FiltroVencimiento;
};

export type TareaDeLista = {
  id: string;
  titulo: string;
  estado: EstadoTarea;
  prioridad: number | null;
  estimacionMin: number | null;
  venceEl: Date | null;
  siguientePaso: string | null;
  motivoBloqueo: string | null;
  proyectoNombre: string | null;
  proyectoSlug: string | null;
  colorAcento: string | null;
  origen: string;
};

export async function listaDeTareas(
  db: Db,
  filtros: FiltrosDeTareas,
  ahora: Date = new Date()
): Promise<TareaDeLista[]> {
  const where: Prisma.TaskWhereInput = {};
  if (filtros.estado) {
    where.estado = filtros.estado;
  } else {
    // Sin filtro de estado, las terminadas no ensucian la vista diaria.
    where.estado = { in: ["inbox", "backlog", "semana", "en_curso"] };
  }
  if (filtros.proyecto === "sin-proyecto") {
    where.project_id = null;
  } else if (filtros.proyecto) {
    where.project = { slug: filtros.proyecto };
  }
  if (filtros.vencimiento === "vencidas") {
    where.vence_el = { lt: ahora };
  } else if (filtros.vencimiento === "proximos-7") {
    where.vence_el = { gte: ahora, lt: new Date(ahora.getTime() + 7 * 86_400_000) };
  }

  const filas = await db.task.findMany({
    where,
    include: { project: { select: { nombre: true, slug: true, color_acento: true } } },
    orderBy: [{ vence_el: { sort: "asc", nulls: "last" } }, { prioridad: { sort: "asc", nulls: "last" } }, { created_at: "asc" }],
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

// Detalle con el log de transiciones (H2.2).
export async function detalleDeTarea(db: Db, tareaId: string) {
  const tarea = await db.task.findUnique({
    where: { id: tareaId },
    include: {
      project: { select: { nombre: true, slug: true, color_acento: true } },
      bloqueante: { select: { id: true, titulo: true } },
      events: { orderBy: { created_at: "asc" } },
    },
  });
  return tarea;
}
