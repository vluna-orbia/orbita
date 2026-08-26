"use server";

// Server actions del Playbook (H5.1, H5.2). Cada mutación crea una
// versión nueva en lib/servicio-playbook; las validaciones de la
// aplicación leen esa última versión en cada operación, así que el
// interruptor apaga la validación de verdad.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { crearVersionConCambio } from "@/lib/servicio-playbook";

export type EstadoPlaybook = { error: string } | null;

function campo(formData: FormData, nombre: string): string {
  return String(formData.get(nombre) ?? "");
}

function revalidarPlaybook(clave?: string): void {
  revalidatePath("/playbook");
  revalidatePath("/playbook/versiones");
  if (clave) revalidatePath(`/playbook/${clave}`);
}

// El interruptor de activación: crea versión con la regla alternada.
export async function alternarReglaAction(formData: FormData): Promise<void> {
  const clave = campo(formData, "clave");
  await crearVersionConCambio(prisma, { tipo: "alternar", clave });
  revalidarPlaybook(clave);
  const volverA = campo(formData, "volver_a");
  redirect(volverA === "ficha" ? `/playbook/${clave}` : "/playbook");
}

export async function editarReglaAction(
  _estado: EstadoPlaybook,
  formData: FormData
): Promise<EstadoPlaybook> {
  const clave = campo(formData, "clave");
  const resultado = await crearVersionConCambio(
    prisma,
    {
      tipo: "editar",
      clave,
      texto: campo(formData, "texto"),
      categoria: campo(formData, "categoria"),
      parametros: campo(formData, "parametros"),
    },
    campo(formData, "motivo")
  );
  if (!resultado.ok) return { error: resultado.error };
  revalidarPlaybook(clave);
  redirect(`/playbook/${clave}?aviso=editada`);
}

export async function anadirReglaAction(
  _estado: EstadoPlaybook,
  formData: FormData
): Promise<EstadoPlaybook> {
  const resultado = await crearVersionConCambio(
    prisma,
    { tipo: "anadir", texto: campo(formData, "texto"), categoria: campo(formData, "categoria") },
    campo(formData, "motivo")
  );
  if (!resultado.ok) return { error: resultado.error };
  revalidarPlaybook();
  redirect("/playbook?aviso=anadida");
}

export async function retirarReglaAction(formData: FormData): Promise<void> {
  const clave = campo(formData, "clave");
  await crearVersionConCambio(prisma, { tipo: "retirar", clave });
  revalidarPlaybook(clave);
  redirect("/playbook?aviso=retirada");
}
