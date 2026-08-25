"use server";

// Server actions del encargo 3. Envoltorios finos: la validación y las
// reglas viven en lib/servicio-proyectos y se aplican siempre en el
// servidor. El middleware exige sesión también para estas acciones.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  actualizarProyecto,
  cambiarEstadoProyecto,
  cerrarDecision,
  crearProyecto,
  guardarBrief,
  type EstadoDestino,
} from "@/lib/servicio-proyectos";

export type EstadoFormulario = { error: string } | null;

function campo(formData: FormData, nombre: string): string {
  return String(formData.get(nombre) ?? "");
}

export async function crearProyectoAction(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const resultado = await crearProyecto(prisma, {
    nombre: campo(formData, "nombre"),
    cliente: campo(formData, "cliente"),
    objetivo: campo(formData, "objetivo"),
  });
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath("/proyectos");
  redirect(
    resultado.aviso ? `/proyectos?enpausa=${resultado.slug}` : `/proyectos/${resultado.slug}`
  );
}

export async function actualizarProyectoAction(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const slug = campo(formData, "slug");
  const resultado = await actualizarProyecto(prisma, slug, {
    nombre: campo(formData, "nombre"),
    cliente: campo(formData, "cliente"),
    objetivo: campo(formData, "objetivo"),
  });
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${slug}`);
  redirect(`/proyectos/${slug}`);
}

// Pausar, activar y archivar (H1.3). Activar valida el límite de R2 en el
// servidor; el rechazo vuelve al detalle con el aviso.
export async function cambiarEstadoAction(formData: FormData): Promise<void> {
  const slug = campo(formData, "slug");
  const destino = campo(formData, "destino") as EstadoDestino;
  if (!["activo", "pausado", "archivado"].includes(destino)) {
    redirect(`/proyectos/${slug}`);
  }
  const resultado = await cambiarEstadoProyecto(prisma, slug, destino);
  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${slug}`);
  if (!resultado.ok) {
    redirect(`/proyectos/${slug}?aviso=limite-activar`);
  }
  redirect(`/proyectos/${slug}`);
}

export async function guardarBriefAction(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const slug = campo(formData, "slug");
  const resultado = await guardarBrief(prisma, slug, campo(formData, "contenido"));
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath(`/proyectos/${slug}`);
  redirect(
    resultado.sinCambios
      ? `/proyectos/${slug}?brief=igual`
      : `/proyectos/${slug}?brief=v${resultado.version}`
  );
}

// Cierre de una decisión: opción elegida y motivo obligatorios, estado a
// cerrada, cerrada_el y dias_abierta congelado (DUDA 2 del encargo 2).
export async function cerrarDecisionAction(
  _estado: EstadoFormulario,
  formData: FormData
): Promise<EstadoFormulario> {
  const slug = campo(formData, "slug");
  const resultado = await cerrarDecision(
    prisma,
    campo(formData, "decision_id"),
    campo(formData, "opcion"),
    campo(formData, "motivo")
  );
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath(`/proyectos/${slug}`);
  redirect(`/proyectos/${slug}?decision=cerrada`);
}
