"use client";

// Captura al inbox sin fricción (H2.1): un campo único con el foco
// puesto, Enter crea la tarea en inbox y el campo se vacía para seguir
// capturando. El proyecto puede indicarse en línea con @nombre, nunca es
// obligatorio.

import { useActionState, useEffect, useRef } from "react";
import { capturarTareaAction } from "@/app/(app)/tareas/acciones";

export function CapturaGlobal({
  abierta,
  onCerrar,
}: {
  abierta: boolean;
  onCerrar: () => void;
}) {
  const [estado, enviar, pendiente] = useActionState(capturarTareaAction, null);
  const campo = useRef<HTMLInputElement>(null);
  const formulario = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!abierta) return;
    campo.current?.focus();
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [abierta, onCerrar]);

  // Tras capturar, el campo se vacía y conserva el foco: el flujo es
  // apuntar varias cosas seguidas sin tocar el ratón.
  useEffect(() => {
    if (estado?.ok) {
      formulario.current?.reset();
      campo.current?.focus();
    }
  }, [estado]);

  if (!abierta) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-tinta/20 px-4 pt-[18vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Capturar al inbox"
        className="w-full max-w-xl rounded-lg border border-linea bg-superficie p-4"
        style={{ boxShadow: "0 1px 2px rgba(20,17,15,0.04)" }}
      >
        <form ref={formulario} action={enviar}>
          <input
            ref={campo}
            type="text"
            name="texto"
            autoComplete="off"
            disabled={pendiente}
            placeholder="Qué hay que hacer. Con @proyecto se asigna en línea."
            aria-label="Qué hay que hacer"
            className="w-full rounded-lg border border-linea bg-superficie px-3 py-2.5 text-[1.0625rem] leading-[1.65] text-tinta placeholder:text-tinta-tenue"
          />
        </form>
        <div className="mt-2 flex items-baseline justify-between gap-4">
          <p className="text-[0.8125rem] text-tinta-tenue">
            Enter captura al inbox y deja el campo listo para la siguiente. Escape cierra.
          </p>
          {estado && !estado.ok ? (
            <p className="text-[0.8125rem] text-rojo">{estado.error}</p>
          ) : null}
          {estado?.ok ? (
            <p role="status" className="whitespace-nowrap text-[0.8125rem] text-verde">
              {estado.mensaje}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
