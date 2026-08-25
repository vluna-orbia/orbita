"use server";

// Server actions del encargo 4 (sesiones). La validación vive en
// lib/servicio-sesiones: una sola sesión activa, duración calculada desde
// started_at en el servidor y nota de cierre obligatoria mientras R3 esté
// activa. revalidatePath con "layout" refresca el cronómetro del lateral
// en todas las pantallas.

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  cerrarSesion,
  empezarSesion,
  latidoDeSesion,
} from "@/lib/servicio-sesiones";

// El estado de error devuelve también lo que el usuario escribió: React
// resetea el formulario tras cada envío y, sin este eco, un fallo de
// validación (R3, por ejemplo) borraría la nota a medias.
export type EstadoSesion = {
  error: string;
  valores?: { intencion?: string; avance?: string; bloqueo?: string; siguientePaso?: string };
} | null;

function campo(formData: FormData, nombre: string): string {
  return String(formData.get(nombre) ?? "");
}

function revalidarTodo() {
  // El cronómetro vive en el layout: hay que revalidar el árbol entero.
  revalidatePath("/", "layout");
}

export async function empezarSesionAction(
  _estado: EstadoSesion,
  formData: FormData
): Promise<EstadoSesion> {
  const intencion = campo(formData, "intencion");
  const resultado = await empezarSesion(prisma, {
    proyectoSlug: campo(formData, "proyecto"),
    intencion,
    tareaId: campo(formData, "tarea_id") || null,
  });
  if (!resultado.ok) return { error: resultado.error, valores: { intencion } };
  revalidarTodo();
  return null;
}

export async function cerrarSesionAction(
  _estado: EstadoSesion,
  formData: FormData
): Promise<EstadoSesion> {
  const nota = {
    avance: campo(formData, "avance"),
    bloqueo: campo(formData, "bloqueo"),
    siguientePaso: campo(formData, "siguiente_paso"),
  };
  const resultado = await cerrarSesion(prisma, campo(formData, "sesion_id"), nota);
  if (!resultado.ok) {
    return {
      error: resultado.error,
      valores: { avance: nota.avance, bloqueo: nota.bloqueo, siguientePaso: nota.siguientePaso },
    };
  }
  revalidarTodo();
  return null;
}

// Latido del cronómetro: deja updated_at como última actividad conocida
// para la detección de huérfanas. No revalida nada: no cambia la interfaz.
export async function latidoDeSesionAction(sesionId: string): Promise<void> {
  await latidoDeSesion(prisma, sesionId);
}
