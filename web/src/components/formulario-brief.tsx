"use client";

// Editor del brief vivo (H1.2): markdown con las seis secciones fijas.
// Guardar crea versión nueva solo si el contenido normalizado cambia.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { guardarBriefAction, type EstadoFormulario } from "@/app/(app)/proyectos/acciones";

export function FormularioBrief({
  slug,
  contenidoInicial,
}: {
  slug: string;
  contenidoInicial: string;
}) {
  const [estado, enviar, pendiente] = useActionState<EstadoFormulario, FormData>(
    guardarBriefAction,
    null
  );

  return (
    <form action={enviar} className="mt-6">
      <input type="hidden" name="slug" value={slug} />
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Contenido en markdown, con las seis secciones fijas
        </span>
        <textarea
          name="contenido"
          required
          rows={24}
          defaultValue={contenidoInicial}
          spellCheck={false}
          className="w-full max-w-[80ch] rounded-lg border border-linea bg-superficie px-4 py-3 text-[0.9375rem] leading-[1.65] text-tinta placeholder:text-tinta-tenue"
        />
      </label>
      <p className="mt-2 max-w-[68ch] text-[0.8125rem] leading-[1.6] text-tinta-tenue">
        El parseo tolera que falte una sección o que cambie el nivel de encabezado. Un retoque de
        formato no crea versión: el hash se calcula sobre el contenido normalizado.
      </p>
      {estado?.error ? <p className="mt-3 text-[0.8125rem] text-rojo">{estado.error}</p> : null}
      <div className="mt-4">
        <Button type="submit" disabled={pendiente}>
          Guardar versión
        </Button>
      </div>
    </form>
  );
}
