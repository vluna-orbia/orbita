"use server";

// Server actions del encargo 4 (tareas). Envoltorios finos: la máquina de
// estados, el límite de WIP y los bloqueos viven en lib/servicio-tareas y
// se validan siempre en el servidor. El middleware exige sesión también
// para estas acciones.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  actualizarTarea,
  bloquearTarea,
  cambiarEstadoTarea,
  capturarTarea,
  desbloquearTarea,
  type ResultadoTransicion,
} from "@/lib/servicio-tareas";

export type EstadoCaptura =
  | { ok: true; mensaje: string }
  | { ok: false; error: string }
  | null;

function campo(formData: FormData, nombre: string): string {
  return String(formData.get(nombre) ?? "");
}

function revalidarTareas(tareaId?: string) {
  revalidatePath("/tareas");
  if (tareaId) revalidatePath(`/tareas/${tareaId}`);
  revalidatePath("/proyectos");
  revalidatePath("/hoy");
}

// Captura al inbox (H2.1): desde el overlay de la tecla c y desde la
// barra móvil. Devuelve el mensaje para que el campo se vacíe y se siga
// capturando sin cambiar de pantalla.
export async function capturarTareaAction(
  _estado: EstadoCaptura,
  formData: FormData
): Promise<EstadoCaptura> {
  const resultado = await capturarTarea(prisma, campo(formData, "texto"));
  if (!resultado.ok) return { ok: false, error: resultado.error };
  revalidarTareas();
  return {
    ok: true,
    mensaje: resultado.proyectoAsignado
      ? `Capturada en el inbox, asignada a ${resultado.proyectoAsignado}.`
      : "Capturada en el inbox.",
  };
}

export type EstadoTransicion = ResultadoTransicion | null;

// Cambio de estado (H2.2, H2.3, H2.4). El resultado viaja de vuelta al
// cliente: el rechazo por WIP trae las tareas en curso para ofrecer
// cerrarlas o devolverlas a semana desde el propio aviso.
export async function cambiarEstadoTareaAction(
  _estado: EstadoTransicion,
  formData: FormData
): Promise<EstadoTransicion> {
  const resultado = await cambiarEstadoTarea(
    prisma,
    campo(formData, "tarea_id"),
    campo(formData, "destino"),
    { siguientePaso: campo(formData, "siguiente_paso") || undefined }
  );
  if (resultado.ok) revalidarTareas(campo(formData, "tarea_id"));
  return resultado;
}

export type EstadoFormularioTarea = { error: string } | null;

export async function actualizarTareaAction(
  _estado: EstadoFormularioTarea,
  formData: FormData
): Promise<EstadoFormularioTarea> {
  const tareaId = campo(formData, "tarea_id");
  const resultado = await actualizarTarea(prisma, tareaId, {
    titulo: campo(formData, "titulo"),
    notas: campo(formData, "notas"),
    proyectoSlug: campo(formData, "proyecto"),
    prioridad: campo(formData, "prioridad"),
    estimacionMin: campo(formData, "estimacion"),
    venceEl: campo(formData, "vence_el"),
    siguientePaso: campo(formData, "siguiente_paso"),
  });
  if (!resultado.ok) return { error: resultado.error };
  revalidarTareas(tareaId);
  redirect(`/tareas/${tareaId}?guardada=1`);
}

export async function bloquearTareaAction(
  _estado: EstadoFormularioTarea,
  formData: FormData
): Promise<EstadoFormularioTarea> {
  const tareaId = campo(formData, "tarea_id");
  const resultado = await bloquearTarea(
    prisma,
    tareaId,
    campo(formData, "motivo"),
    campo(formData, "bloqueada_por") || null
  );
  if (!resultado.ok) return { error: resultado.error };
  revalidarTareas(tareaId);
  return null;
}

export async function desbloquearTareaAction(formData: FormData): Promise<void> {
  const tareaId = campo(formData, "tarea_id");
  await desbloquearTarea(prisma, tareaId);
  revalidarTareas(tareaId);
}
