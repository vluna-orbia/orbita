"use client";

// Bloqueo de una tarea (H2.5): motivo obligatorio y, si se quiere, la
// tarea que la bloquea. Las bloqueadas no cuentan para el límite de WIP y
// el brief diario destacará las que lleven más de 3 días (encargo 7).

import { useActionState, useState } from "react";
import { bloquearTareaAction, desbloquearTareaAction } from "@/app/(app)/tareas/acciones";
import { Button } from "@/components/ui/button";

export function BloqueoTarea({
  tareaId,
  motivoActual,
  bloqueanteActual,
  candidatas,
}: {
  tareaId: string;
  motivoActual: string | null;
  bloqueanteActual: { id: string; titulo: string } | null;
  candidatas: { id: string; titulo: string }[];
}) {
  const [estado, enviar, pendiente] = useActionState(bloquearTareaAction, null);
  const [abierto, setAbierto] = useState(false);

  if (motivoActual) {
    return (
      <div className="mt-4 rounded-lg bg-papel-hondo px-4 py-3">
        <p className="text-[0.9375rem] leading-[1.6] text-tinta">
          Bloqueada: {motivoActual}
          {bloqueanteActual ? (
            <span className="text-tinta-media"> — la bloquea «{bloqueanteActual.titulo}»</span>
          ) : null}
        </p>
        <form action={desbloquearTareaAction} className="mt-2">
          <input type="hidden" name="tarea_id" value={tareaId} />
          <Button type="submit" variant="secondary" size="sm">
            Desbloquear
          </Button>
        </form>
      </div>
    );
  }

  if (!abierto) {
    return (
      <div className="mt-4">
        <Button variant="ghost" size="sm" onClick={() => setAbierto(true)}>
          Marcar como bloqueada
        </Button>
      </div>
    );
  }

  return (
    <form action={enviar} className="mt-4 flex flex-col gap-3 rounded-lg bg-papel-hondo p-4">
      <input type="hidden" name="tarea_id" value={tareaId} />
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Qué la bloquea
        </span>
        <input
          type="text"
          name="motivo"
          autoFocus
          placeholder="El motivo, en una frase."
          className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] text-tinta placeholder:text-tinta-tenue"
        />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Tarea que la bloquea, si la hay
        </span>
        <select
          name="bloqueada_por"
          defaultValue=""
          className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] text-tinta"
        >
          <option value="">Ninguna</option>
          {candidatas.map((c) => (
            <option key={c.id} value={c.id}>
              {c.titulo}
            </option>
          ))}
        </select>
      </label>
      {estado?.error ? <p className="text-[0.8125rem] text-rojo">{estado.error}</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" variant="secondary" size="sm" disabled={pendiente}>
          Marcar como bloqueada
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
