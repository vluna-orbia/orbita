"use server";

// Server actions de los rituales (H4.1, H4.2, H4.3). Envoltorios finos
// sobre lib/servicio-rituales: la validación (el inbox que bloquea, el
// límite de R2, el resultado por proyecto activo) vive en el servidor.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  avanzarTrasTriaje,
  convertirCambioEnRegla,
  guardarProyectosActivos,
  guardarResultados,
  guardarRetro,
  guardarTareasDeLaSemana,
  marcarResultado,
  posponerRitual,
  triarEnRitual,
} from "@/lib/servicio-rituales";

export type EstadoRitual = { error: string } | null;

function campo(formData: FormData, nombre: string): string {
  return String(formData.get(nombre) ?? "");
}

// ---------- Paso 1: triaje del inbox ----------

export async function triarEnRitualAction(
  _estado: EstadoRitual,
  formData: FormData
): Promise<EstadoRitual> {
  const resultado = await triarEnRitual(prisma, campo(formData, "tarea"), {
    destino: campo(formData, "destino"),
    proyectoSlug: campo(formData, "proyecto") || undefined,
  });
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath("/rituales/planificacion");
  revalidatePath("/tareas");
  return null;
}

export async function avanzarTrasTriajeAction(
  _estado: EstadoRitual,
  _formData: FormData
): Promise<EstadoRitual> {
  const resultado = await avanzarTrasTriaje(prisma);
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath("/rituales");
  redirect("/rituales/planificacion?paso=2");
}

// ---------- Paso 2: proyectos activos ----------

export async function guardarProyectosActivosAction(
  _estado: EstadoRitual,
  formData: FormData
): Promise<EstadoRitual> {
  const slugs = formData.getAll("proyectos").map(String);
  const resultado = await guardarProyectosActivos(prisma, slugs);
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath("/rituales");
  revalidatePath("/proyectos");
  revalidatePath("/hoy");
  redirect("/rituales/planificacion?paso=3");
}

// ---------- Paso 3: resultado de la semana ----------

export async function guardarResultadosAction(
  _estado: EstadoRitual,
  formData: FormData
): Promise<EstadoRitual> {
  const resultados = formData
    .getAll("slug")
    .map(String)
    .map((slug) => ({ slug, descripcion: campo(formData, `resultado-${slug}`) }));
  const resultado = await guardarResultados(prisma, resultados);
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath("/rituales");
  revalidatePath("/proyectos");
  redirect("/rituales/planificacion?paso=4");
}

// ---------- Paso 4: tareas de la semana ----------

export async function guardarTareasAction(
  _estado: EstadoRitual,
  formData: FormData
): Promise<EstadoRitual> {
  const seleccion = formData.getAll("tareas").map(String);
  const resultado = await guardarTareasDeLaSemana(prisma, seleccion);
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath("/rituales");
  revalidatePath("/tareas");
  revalidatePath("/hoy");
  redirect("/rituales?hecho=plan");
}

// ---------- Retrospectiva (H4.2) ----------

export async function marcarResultadoAction(formData: FormData): Promise<void> {
  await marcarResultado(prisma, campo(formData, "resultado"), campo(formData, "cumplido") === "si");
  revalidatePath("/rituales/retrospectiva");
  revalidatePath("/rituales");
}

export async function guardarRetroAction(
  _estado: EstadoRitual,
  formData: FormData
): Promise<EstadoRitual> {
  const resultado = await guardarRetro(prisma, {
    queFunciono: campo(formData, "que_funciono"),
    queNo: campo(formData, "que_no"),
    quePruebo: campo(formData, "que_pruebo"),
  });
  if (!resultado.ok) return { error: resultado.error };
  revalidatePath("/rituales");
  revalidatePath("/hoy");
  if (campo(formData, "convertir") === "si") {
    const conversion = await convertirCambioEnRegla(prisma);
    if (!conversion.ok) return { error: conversion.error };
    revalidatePath("/playbook");
    redirect("/rituales?hecho=retro-y-regla");
  }
  redirect("/rituales?hecho=retro");
}

// ---------- Aviso de ritual pendiente (H4.3) ----------

export async function posponerRitualAction(formData: FormData): Promise<void> {
  const tipo = campo(formData, "tipo");
  if (tipo === "plan" || tipo === "retro") {
    await posponerRitual(prisma, tipo);
  }
  revalidatePath("/hoy");
  redirect("/hoy");
}
