"use client";

// Cronómetro de sesión (H3.1): visible en todas las pantallas y calculado
// desde started_at, que viene del servidor. El cliente solo pinta el paso
// del tiempo: recargar la página no pierde tiempo ni lo inventa.

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatoCronometro } from "@/lib/sesiones";
import { EVENTO_CERRAR, EVENTO_EMPEZAR } from "./capa-global";
import type { SesionActiva } from "@/lib/servicio-sesiones";

function segundosDesde(inicio: Date): number {
  return Math.max(0, Math.floor((Date.now() - new Date(inicio).getTime()) / 1000));
}

function useSegundos(inicio: Date): number | null {
  // Primer render en null: el servidor no puede pintar un valor que
  // cambia cada segundo sin desincronizarse con la hidratación.
  const [segundos, setSegundos] = useState<number | null>(null);
  useEffect(() => {
    setSegundos(segundosDesde(inicio));
    const id = window.setInterval(() => setSegundos(segundosDesde(inicio)), 1000);
    return () => window.clearInterval(id);
  }, [inicio]);
  return segundos;
}

// Bloque del lateral de escritorio: cronómetro vivo en coral, intención
// debajo para no olvidar qué se estaba haciendo, y el botón de cierre.
export function SesionLateral({ sesion }: { sesion: SesionActiva | null }) {
  const segundos = useSegundos(sesion?.startedAt ?? new Date(0));

  if (!sesion) {
    return (
      <div className="border-t border-linea pt-4">
        <p className="t-micro text-tinta-tenue">Sesión</p>
        <p className="mt-1 text-[0.8125rem] text-tinta-tenue">Ninguna en curso</p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3 w-full"
          onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_EMPEZAR))}
        >
          Empezar sesión
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-linea pt-4">
      <p className="t-micro text-tinta-tenue">Sesión en curso</p>
      <p className="t-dato mt-1 text-[1.5rem] leading-none text-coral-hondo" aria-live="off">
        {segundos === null ? "—" : formatoCronometro(segundos)}
      </p>
      <p className="mt-2 text-[0.8125rem] leading-[1.5] text-tinta-media">{sesion.intencion}</p>
      <p className="mt-0.5 text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-tinta-tenue">
        {sesion.proyectoNombre}
      </p>
      <Button
        size="sm"
        className="mt-3 w-full"
        onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_CERRAR))}
      >
        Cerrar sesión de trabajo
      </Button>
    </div>
  );
}

// En móvil la sesión en curso pasa a una barra fija superior (documento
// 01, estructura de página).
export function SesionMovil({ sesion }: { sesion: SesionActiva | null }) {
  const segundos = useSegundos(sesion?.startedAt ?? new Date(0));
  if (!sesion) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-40 flex min-h-[44px] items-center justify-between gap-3 border-b border-linea bg-papel px-4 py-2 md:hidden">
      <div className="min-w-0">
        <p className="t-dato text-[1.0625rem] leading-none text-coral-hondo">
          {segundos === null ? "—" : formatoCronometro(segundos)}
        </p>
        <p className="mt-0.5 truncate text-[0.6875rem] text-tinta-tenue">{sesion.intencion}</p>
      </div>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_CERRAR))}
        className="shrink-0 rounded-[6px] border border-linea bg-superficie px-3 py-2 text-[0.8125rem] font-medium text-tinta"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
