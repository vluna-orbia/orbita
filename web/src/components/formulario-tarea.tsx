"use client";

// Edición de los campos de una tarea en su detalle. Los cambios de estado
// no van aquí: pasan por la máquina de estados con su registro (H2.2).

import { useActionState } from "react";
import { actualizarTareaAction } from "@/app/(app)/tareas/acciones";
import { Button } from "@/components/ui/button";

type Valores = {
  id: string;
  titulo: string;
  notas: string;
  proyectoSlug: string;
  prioridad: number | null;
  estimacionMin: number | null;
  venceEl: string; // aaaa-mm-dd o vacío
  siguientePaso: string;
};

const CLASE_CAMPO =
  "w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue";

export function FormularioTarea({
  valores,
  proyectos,
}: {
  valores: Valores;
  proyectos: { nombre: string; slug: string }[];
}) {
  const [estado, enviar, pendiente] = useActionState(actualizarTareaAction, null);

  return (
    <form action={enviar} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="tarea_id" value={valores.id} />
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Título
        </span>
        <input type="text" name="titulo" defaultValue={valores.titulo} className={CLASE_CAMPO} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Notas
        </span>
        <textarea name="notas" rows={3} defaultValue={valores.notas} className={CLASE_CAMPO} />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Proyecto
          </span>
          <select name="proyecto" defaultValue={valores.proyectoSlug} className={CLASE_CAMPO}>
            <option value="">Sin proyecto</option>
            {proyectos.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Prioridad
          </span>
          <select
            name="prioridad"
            defaultValue={valores.prioridad === null ? "" : String(valores.prioridad)}
            className={CLASE_CAMPO}
          >
            <option value="">Sin prioridad</option>
            <option value="1">1 — alta</option>
            <option value="2">2 — media</option>
            <option value="3">3 — baja</option>
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Estimación en minutos
          </span>
          <input
            type="number"
            name="estimacion"
            min={1}
            step={1}
            defaultValue={valores.estimacionMin ?? ""}
            className={CLASE_CAMPO}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Vence el
          </span>
          <input type="date" name="vence_el" defaultValue={valores.venceEl} className={CLASE_CAMPO} />
        </label>
      </div>
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Siguiente paso
        </span>
        <input
          type="text"
          name="siguiente_paso"
          defaultValue={valores.siguientePaso}
          placeholder="La primera acción concreta al retomarla."
          className={CLASE_CAMPO}
        />
      </label>
      {estado?.error ? <p className="text-[0.8125rem] text-rojo">{estado.error}</p> : null}
      <div>
        <Button type="submit" disabled={pendiente}>
          Guardar cambios
        </Button>
      </div>
    </form>
  );
}
