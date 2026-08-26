"use client";

// Paso 1 del ritual (H4.1): triaje del inbox. Cada elemento va a un
// proyecto y a backlog o semana, o se descarta; descartar cuenta como
// procesado. No se puede avanzar con el inbox sin vaciar: el servidor lo
// rechaza y aquí solo se enseña el motivo.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  avanzarTrasTriajeAction,
  triarEnRitualAction,
  type EstadoRitual,
} from "@/app/(app)/rituales/acciones";

export type ProyectoParaTriaje = { slug: string; nombre: string; estado: "activo" | "pausado" };
export type ElementoParaTriaje = { id: string; titulo: string; proyectoSlug: string | null };

function FilaDeTriaje({
  elemento,
  proyectos,
}: {
  elemento: ElementoParaTriaje;
  proyectos: ProyectoParaTriaje[];
}) {
  const [estado, enviar, pendiente] = useActionState<EstadoRitual, FormData>(
    triarEnRitualAction,
    null
  );
  return (
    <li className="rounded-lg border border-linea bg-superficie p-4">
      <form action={enviar}>
        <input type="hidden" name="tarea" value={elemento.id} />
        <p className="text-[0.9375rem] leading-[1.6] text-tinta">{elemento.titulo}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            name="proyecto"
            defaultValue={elemento.proyectoSlug ?? ""}
            aria-label={`Proyecto para ${elemento.titulo}`}
            className="h-9 rounded-lg border border-linea bg-superficie px-2 text-[0.8125rem] text-tinta"
          >
            <option value="">Elige proyecto</option>
            {proyectos.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.nombre}
                {p.estado === "pausado" ? " (en pausa)" : ""}
              </option>
            ))}
          </select>
          <Button
            type="submit"
            name="destino"
            value="backlog"
            variant="secondary"
            size="sm"
            disabled={pendiente}
          >
            Al backlog
          </Button>
          <Button
            type="submit"
            name="destino"
            value="semana"
            variant="secondary"
            size="sm"
            disabled={pendiente}
          >
            A la semana
          </Button>
          <Button
            type="submit"
            name="destino"
            value="descartada"
            variant="ghost"
            size="sm"
            disabled={pendiente}
          >
            Descartar
          </Button>
        </div>
        {estado?.error ? (
          <p role="alert" className="mt-2 text-[0.8125rem] text-rojo">
            {estado.error}
          </p>
        ) : null}
      </form>
    </li>
  );
}

export function PasoTriaje({
  elementos,
  proyectos,
}: {
  elementos: ElementoParaTriaje[];
  proyectos: ProyectoParaTriaje[];
}) {
  const [estado, avanzar, pendiente] = useActionState<EstadoRitual, FormData>(
    avanzarTrasTriajeAction,
    null
  );
  return (
    <>
      {elementos.length > 0 ? (
        <>
          <p className="mt-1 text-[0.8125rem] text-tinta-tenue">
            {elementos.length === 1
              ? "Queda 1 elemento por procesar."
              : `Quedan ${elementos.length} elementos por procesar.`}
          </p>
          <ul className="mt-4 flex flex-col gap-2">
            {elementos.map((e) => (
              <FilaDeTriaje key={e.id} elemento={e} proyectos={proyectos} />
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 max-w-[68ch] rounded-lg border border-linea bg-superficie p-6 text-[0.9375rem] leading-[1.6] text-tinta-media">
          Inbox vacío. Todo lo capturado tiene sitio: se puede avanzar.
        </p>
      )}
      <form action={avanzar} className="mt-6">
        <Button type="submit" disabled={pendiente || elementos.length > 0}>
          Avanzar a los proyectos
        </Button>
        {elementos.length > 0 ? (
          <p className="mt-2 text-[0.8125rem] text-tinta-tenue">
            El inbox tiene que quedar vacío para avanzar. Descartar también cuenta.
          </p>
        ) : null}
        {estado?.error ? (
          <p role="alert" className="mt-2 text-[0.8125rem] text-rojo">
            {estado.error}
          </p>
        ) : null}
      </form>
    </>
  );
}
