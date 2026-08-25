"use client";

// Sesión huérfana (H3.3): pasadas 4 horas la sesión queda abandonada con
// la duración hasta la última actividad conocida, y la nota de cierre se
// pide la próxima vez que se entra. Se puede posponer; volverá a pedirse.

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cerrarSesionAction } from "@/app/(app)/sesiones/acciones";
import { formatoMinutos } from "@/lib/sesiones";
import { fechaConHora } from "@/lib/formato";
import type { SesionPendienteDeNota } from "@/lib/servicio-sesiones";

export function NotaPendiente({
  pendientes,
  r3Activa,
}: {
  pendientes: SesionPendienteDeNota[];
  r3Activa: boolean;
}) {
  const [pospuesta, setPospuesta] = useState(false);
  const [estado, enviar, pendiente] = useActionState(cerrarSesionAction, null);
  const sesion = pendientes[0];

  if (!sesion || pospuesta) return null;

  return (
    <Modal
      abierto
      onCerrar={() => setPospuesta(true)}
      titulo="Una sesión quedó abierta"
    >
      <p className="mt-2 text-[0.9375rem] leading-[1.6] text-tinta-media">
        La sesión de {sesion.proyectoNombre} del {fechaConHora(sesion.startedAt)} quedó
        abandonada pasadas 4 horas
        {sesion.duracionMin !== null
          ? `, con ${formatoMinutos(sesion.duracionMin)} contados hasta la última actividad`
          : ""}
        . Escribe la nota de cierre para no perder el contexto.
      </p>
      <p className="mt-1 text-[0.8125rem] text-tinta-tenue">{sesion.intencion}</p>
      <form action={enviar} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="sesion_id" value={sesion.id} />
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Qué avanzaste
          </span>
          <textarea
            name="avance"
            rows={2}
            defaultValue={estado?.valores?.avance ?? ""}
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Qué te bloquea, si hay algo
          </span>
          <textarea
            name="bloqueo"
            rows={2}
            defaultValue={estado?.valores?.bloqueo ?? ""}
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Siguiente paso
          </span>
          <input
            type="text"
            name="siguiente_paso"
            autoComplete="off"
            defaultValue={estado?.valores?.siguientePaso ?? ""}
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta"
            placeholder={r3Activa ? "Obligatorio: es la regla R3." : "Qué harás al retomar."}
          />
        </label>
        {estado?.error ? <p className="text-[0.8125rem] text-rojo">{estado.error}</p> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pendiente}>
            Guardar nota de cierre
          </Button>
          <Button type="button" variant="ghost" onClick={() => setPospuesta(true)}>
            Más tarde
          </Button>
        </div>
      </form>
    </Modal>
  );
}
