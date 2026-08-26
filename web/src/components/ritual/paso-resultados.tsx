"use client";

// Paso 3 del ritual (H4.1): el resultado de la semana, una frase por
// proyecto activo, verificable con un sí o un no en la retrospectiva.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { guardarResultadosAction, type EstadoRitual } from "@/app/(app)/rituales/acciones";

export type ResultadoParaPaso3 = {
  slug: string;
  nombre: string;
  colorAcento: string;
  descripcion: string;
};

export function PasoResultados({ resultados }: { resultados: ResultadoParaPaso3[] }) {
  const [estado, enviar, pendiente] = useActionState<EstadoRitual, FormData>(
    guardarResultadosAction,
    null
  );
  return (
    <form action={enviar}>
      <p className="mt-1 max-w-[68ch] text-[0.8125rem] text-tinta-tenue">
        Una frase por proyecto, verificable con un sí o un no el viernes. Si no se puede
        verificar, no es un resultado.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        {resultados.map((r) => (
          <label
            key={r.slug}
            className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-4"
          >
            <span className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-5 w-[3px] rounded-full"
                style={{ backgroundColor: r.colorAcento }}
              />
              <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
                {r.nombre}
              </span>
            </span>
            <input type="hidden" name="slug" value={r.slug} />
            <textarea
              name={`resultado-${r.slug}`}
              rows={2}
              required
              defaultValue={r.descripcion}
              placeholder="Qué habrá pasado el viernes si la semana sale bien"
              className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue"
            />
          </label>
        ))}
      </div>
      {estado?.error ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <div className="mt-6">
        <Button type="submit" disabled={pendiente}>
          Comprometer y elegir tareas
        </Button>
      </div>
    </form>
  );
}
