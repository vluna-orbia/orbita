"use client";

// Modal mínimo del sistema de diseño: superficie blanca, borde de línea,
// sin sombras aparatosas. Escape cierra; el foco entra al abrirse.

import { useEffect, useRef } from "react";

export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
  ancho = "max-w-lg",
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: React.ReactNode;
  ancho?: string;
}) {
  const referencia = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    // El foco entra al primer campo del modal.
    const campo = referencia.current?.querySelector<HTMLElement>(
      "input, textarea, select, button"
    );
    campo?.focus();
    return () => document.removeEventListener("keydown", alPulsar);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-tinta/20 px-4 py-12 md:items-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      <div
        ref={referencia}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className={`w-full ${ancho} rounded-lg border border-linea bg-superficie p-6 md:p-8`}
        style={{ boxShadow: "0 1px 2px rgba(20,17,15,0.04)" }}
      >
        <h2 className="text-[1.25rem] font-semibold leading-[1.3] text-tinta">{titulo}</h2>
        {children}
      </div>
    </div>
  );
}
