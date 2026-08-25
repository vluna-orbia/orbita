"use client";

// Sección 2 de la pantalla Hoy: la sesión activa con su cronómetro, o el
// botón de empezar. Es la única sección que siempre tiene contenido. El
// cronómetro pinta desde startedAt del servidor, como el del lateral.

import { Button } from "@/components/ui/button";
import { formatoCronometro } from "@/lib/sesiones";
import type { SesionActiva } from "@/lib/servicio-sesiones";
import { EVENTO_CERRAR } from "./capa-global";
import { useSegundos } from "./cronometro-sesion";
import { BotonEmpezarSesion } from "./boton-empezar-sesion";

export function SesionHoy({ sesion }: { sesion: SesionActiva | null }) {
  const segundos = useSegundos(sesion?.startedAt ?? new Date(0));

  if (!sesion) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <BotonEmpezarSesion />
        <p className="text-[0.8125rem] text-tinta-tenue">
          Intención declarada, cronómetro y nota de cierre.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-lg border border-linea bg-superficie p-6">
      <p className="t-micro text-tinta-tenue">Sesión en curso</p>
      <p className="t-dato mt-2 text-[2rem] leading-none text-coral-hondo" aria-live="off">
        {segundos === null ? "—" : formatoCronometro(segundos)}
      </p>
      <p className="mt-3 text-[0.9375rem] leading-[1.6] text-tinta">{sesion.intencion}</p>
      <p className="mt-1 text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-tinta-tenue">
        {sesion.proyectoNombre}
        {sesion.tareaTitulo ? ` · ${sesion.tareaTitulo}` : ""}
      </p>
      <Button
        size="sm"
        className="mt-4"
        onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_CERRAR))}
      >
        Cerrar sesión de trabajo
      </Button>
    </div>
  );
}
