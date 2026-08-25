"use client";

// Decisiones abiertas del proyecto (adenda 04): qué opciones se barajan,
// quién la bloquea y cuántos días lleva abierta. El cierre registra la
// opción elegida y el motivo, como pide la regla R6; el formulario se
// abre en la propia fila, sin cambiar de pantalla.

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { cerrarDecisionAction } from "@/app/(app)/proyectos/acciones";
import type { DecisionAbierta } from "@/lib/servicio-proyectos";

function FormularioCierre({ decision, slug }: { decision: DecisionAbierta; slug: string }) {
  const [estado, enviar, pendiente] = useActionState(cerrarDecisionAction, null);
  return (
    <form action={enviar} className="mt-4 border-t border-linea pt-4">
      <input type="hidden" name="decision_id" value={decision.id} />
      <input type="hidden" name="slug" value={slug} />
      <fieldset>
        <legend className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Opción elegida
        </legend>
        <div className="mt-2 flex flex-col gap-2">
          {decision.opciones.map((opcion) => (
            <label key={opcion} className="flex items-start gap-2.5 text-[0.9375rem] text-tinta">
              <input
                type="radio"
                name="opcion"
                value={opcion}
                required
                className="mt-1.5 h-4 w-4 accent-coral"
              />
              <span className="leading-[1.6]">{opcion}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Motivo de la elección
        </span>
        <textarea
          name="motivo"
          required
          rows={3}
          className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue"
          placeholder="Por qué esta opción y no las otras. Queda registrado con la decisión."
        />
      </label>
      {estado?.error ? <p className="mt-3 text-[0.8125rem] text-rojo">{estado.error}</p> : null}
      <div className="mt-4">
        <Button type="submit" disabled={pendiente}>
          Cerrar decisión
        </Button>
      </div>
    </form>
  );
}

export function DecisionesAbiertas({
  decisiones,
  slug,
  umbralDias,
}: {
  decisiones: DecisionAbierta[];
  slug: string;
  umbralDias: number | null;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);

  if (decisiones.length === 0) {
    return (
      <p className="mt-4 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-media">
        No hay decisiones abiertas en este proyecto. Cuando una tenga más de una opción viable,
        regístrala antes de ejecutarla: es la regla R6.
      </p>
    );
  }

  return (
    <ul className="mt-4 flex flex-col gap-3">
      {decisiones.map((d) => {
        const pasada = umbralDias !== null && d.diasAbierta > umbralDias;
        const expandida = abierta === d.id;
        return (
          <li key={d.id} className="rounded-lg border border-linea bg-superficie p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-[0.9375rem] font-semibold text-tinta">{d.titulo}</h3>
              <p className="t-dato text-[0.875rem] whitespace-nowrap">
                <span className={pasada ? "text-ambar" : "text-tinta-media"}>
                  {d.diasAbierta} {d.diasAbierta === 1 ? "día" : "días"} abierta
                </span>
              </p>
            </div>
            {d.bloqueadoPor ? (
              <p className="mt-1 text-[0.8125rem] text-tinta-media">
                <span className="t-micro text-tinta-tenue">Bloquea</span> {d.bloqueadoPor}
              </p>
            ) : null}
            <ul className="mt-3 flex flex-wrap gap-2">
              {d.opciones.map((opcion) => (
                <li
                  key={opcion}
                  className="rounded-full bg-papel-hondo px-3 py-1 text-[0.8125rem] leading-[1.5] text-tinta-media"
                >
                  {opcion}
                </li>
              ))}
            </ul>
            {expandida ? (
              <FormularioCierre decision={d} slug={slug} />
            ) : (
              <div className="mt-3">
                <Button variant="ghost" size="sm" onClick={() => setAbierta(d.id)}>
                  Cerrar decisión
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
