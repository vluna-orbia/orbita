"use client";

// Cierre de sesión (H3.2): qué avancé, qué me bloquea (opcional) y el
// siguiente paso, obligatorio mientras R3 esté activa. El siguiente paso
// se copia a la tarea vinculada. La duración la calcula el servidor desde
// started_at.

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cerrarSesionAction } from "@/app/(app)/sesiones/acciones";
import type { SesionActiva } from "@/lib/servicio-sesiones";

export function CerrarSesion({
  abierto,
  onCerrar,
  sesion,
  r3Activa,
}: {
  abierto: boolean;
  onCerrar: () => void;
  sesion: SesionActiva;
  r3Activa: boolean;
}) {
  const [estado, enviar, pendiente] = useActionState(cerrarSesionAction, null);
  const [enviado, setEnviado] = useState(false);
  useEffect(() => {
    if (enviado && !pendiente && estado === null) {
      setEnviado(false);
      onCerrar();
    }
  }, [enviado, pendiente, estado, onCerrar]);

  if (!abierto) return null;

  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo="Cerrar sesión de trabajo">
      <p className="mt-1 text-[0.8125rem] text-tinta-tenue">{sesion.intencion}</p>
      <form
        action={enviar}
        onSubmit={() => setEnviado(true)}
        className="mt-4 flex flex-col gap-4"
      >
        <input type="hidden" name="sesion_id" value={sesion.id} />
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Qué avanzaste
          </span>
          <textarea
            name="avance"
            rows={2}
            defaultValue={estado?.valores?.avance ?? ""}
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue"
            placeholder="Lo que quedó hecho o encaminado."
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
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue"
            placeholder="Opcional."
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
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue"
            placeholder={
              r3Activa
                ? "Obligatorio: es la regla R3. Te ahorra el arranque en frío."
                : "Qué harás al retomar."
            }
          />
          {sesion.tareaTitulo ? (
            <span className="text-[0.8125rem] text-tinta-tenue">
              Se copiará a la tarea vinculada: {sesion.tareaTitulo}
            </span>
          ) : null}
        </label>
        {estado?.error ? <p className="text-[0.8125rem] text-rojo">{estado.error}</p> : null}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pendiente}>
            Cerrar sesión de trabajo
          </Button>
          <Button type="button" variant="ghost" onClick={onCerrar}>
            Seguir trabajando
          </Button>
        </div>
      </form>
    </Modal>
  );
}
