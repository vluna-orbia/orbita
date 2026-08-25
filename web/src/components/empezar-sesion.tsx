"use client";

// Arranque de sesión (H3.1): intención declarada en una frase, proyecto y
// tarea vinculada opcional, filtrada por el proyecto elegido. Una sola
// sesión activa a la vez: la segunda se rechaza en el servidor.

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { empezarSesionAction } from "@/app/(app)/sesiones/acciones";
import type { ProyectoGlobal, TareaVinculable } from "./capa-global";

export function EmpezarSesion({
  abierto,
  onCerrar,
  proyectos,
  tareasVinculables,
}: {
  abierto: boolean;
  onCerrar: () => void;
  proyectos: ProyectoGlobal[];
  tareasVinculables: TareaVinculable[];
}) {
  const [estado, enviar, pendiente] = useActionState(empezarSesionAction, null);
  const activos = proyectos.filter((p) => p.estado === "activo");
  const enPausa = proyectos.filter((p) => p.estado === "pausado");
  const [proyecto, setProyecto] = useState(activos[0]?.slug ?? proyectos[0]?.slug ?? "");
  const tareas = tareasVinculables.filter((t) => t.proyectoSlug === proyecto);

  // El modal se cierra cuando el arranque llega bien: estado vuelve a
  // null y la sesión aparece en el lateral con el refresco del layout.
  const [enviado, setEnviado] = useState(false);
  useEffect(() => {
    if (enviado && !pendiente && estado === null) {
      setEnviado(false);
      onCerrar();
    }
  }, [enviado, pendiente, estado, onCerrar]);

  if (!abierto) return null;

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Empezar sesión">
      <form
        action={enviar}
        onSubmit={() => setEnviado(true)}
        className="mt-4 flex flex-col gap-4"
      >
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Intención de la sesión
          </span>
          <input
            type="text"
            name="intencion"
            autoComplete="off"
            defaultValue={estado?.valores?.intencion ?? ""}
            placeholder="Qué vas a avanzar, en una frase."
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Proyecto
          </span>
          <select
            name="proyecto"
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2.5 text-[0.9375rem] text-tinta"
          >
            {activos.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.nombre}
              </option>
            ))}
            {enPausa.length > 0 ? (
              <optgroup label="En pausa">
                {enPausa.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.nombre}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Tarea vinculada, si quieres
          </span>
          <select
            name="tarea_id"
            defaultValue=""
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2.5 text-[0.9375rem] text-tinta"
          >
            <option value="">Sin tarea vinculada</option>
            {tareas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.titulo}
              </option>
            ))}
          </select>
        </label>
        {estado?.error ? (
          <p className="text-[0.8125rem] text-rojo">{estado.error}</p>
        ) : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pendiente}>
            Empezar sesión
          </Button>
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Ahora no
          </Button>
        </div>
      </form>
    </Modal>
  );
}
