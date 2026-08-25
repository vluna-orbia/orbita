"use client";

// Formulario de proyecto (H1.1): nombre obligatorio, cliente opcional,
// objetivo obligatorio de hasta 280 caracteres. La validación que cuenta
// ocurre en el servidor; aquí solo hay ayudas.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { EstadoFormulario } from "@/app/(app)/proyectos/acciones";

const OBJETIVO_MAXIMO = 280;

export function FormularioProyecto({
  action,
  textoEnviar,
  valores,
  slug,
}: {
  action: (estado: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>;
  textoEnviar: string;
  valores?: { nombre: string; cliente: string; objetivo: string };
  slug?: string;
}) {
  const [estado, enviar, pendiente] = useActionState(action, null);

  return (
    <form action={enviar} className="mt-6 flex max-w-[68ch] flex-col gap-5">
      {slug ? <input type="hidden" name="slug" value={slug} /> : null}
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Nombre
        </span>
        <Input name="nombre" required autoFocus defaultValue={valores?.nombre ?? ""} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Cliente <span className="font-normal text-tinta-tenue">(opcional)</span>
        </span>
        <Input name="cliente" defaultValue={valores?.cliente ?? ""} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Objetivo <span className="font-normal text-tinta-tenue">(hasta 280 caracteres)</span>
        </span>
        <textarea
          name="objetivo"
          required
          maxLength={OBJETIVO_MAXIMO}
          rows={3}
          defaultValue={valores?.objetivo ?? ""}
          className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue"
          placeholder="Una frase verificable: qué tiene que pasar para dar el proyecto por bien encaminado."
        />
      </label>
      {estado?.error ? <p className="text-[0.8125rem] text-rojo">{estado.error}</p> : null}
      <div>
        <Button type="submit" disabled={pendiente}>
          {textoEnviar}
        </Button>
      </div>
    </form>
  );
}
