"use client";

// Capa global del encargo 4: los atajos de teclado (c capturar, s empezar
// sesión, g p ir a proyectos), el overlay de captura, el arranque y el
// cierre de sesión, y la petición de nota de las sesiones abandonadas.
// Vive en el layout: funciona desde cualquier pantalla.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CapturaGlobal } from "./captura-global";
import { CerrarSesion } from "./cerrar-sesion";
import { EmpezarSesion } from "./empezar-sesion";
import { NotaPendiente } from "./nota-pendiente";
import { latidoDeSesionAction } from "@/app/(app)/sesiones/acciones";
import type { SesionActiva, SesionPendienteDeNota } from "@/lib/servicio-sesiones";

// Cada cuántos milisegundos el cronómetro abierto avisa al servidor: ese
// latido queda como última actividad conocida para las huérfanas (H3.3).
const INTERVALO_LATIDO = 5 * 60_000;

export type ProyectoGlobal = {
  id: string;
  nombre: string;
  slug: string;
  estado: "activo" | "pausado";
};

export type TareaVinculable = {
  id: string;
  titulo: string;
  proyectoSlug: string;
};

// Los botones del lateral y de la barra móvil disparan estos eventos; la
// capa global los escucha igual que a los atajos de teclado.
export const EVENTO_CAPTURAR = "orbita:capturar";
export const EVENTO_EMPEZAR = "orbita:empezar-sesion";
export const EVENTO_CERRAR = "orbita:cerrar-sesion";

function esCampoDeTexto(objetivo: EventTarget | null): boolean {
  if (!(objetivo instanceof HTMLElement)) return false;
  const etiqueta = objetivo.tagName;
  return (
    etiqueta === "INPUT" ||
    etiqueta === "TEXTAREA" ||
    etiqueta === "SELECT" ||
    objetivo.isContentEditable
  );
}

export function CapaGlobal({
  proyectos,
  tareasVinculables,
  sesion,
  pendientesDeNota,
  r3Activa,
}: {
  proyectos: ProyectoGlobal[];
  tareasVinculables: TareaVinculable[];
  sesion: SesionActiva | null;
  pendientesDeNota: SesionPendienteDeNota[];
  r3Activa: boolean;
}) {
  const router = useRouter();
  const [captura, setCaptura] = useState(false);
  const [empezar, setEmpezar] = useState(false);
  const [cerrar, setCerrar] = useState(false);
  // Secuencia g p: la g espera a la siguiente tecla un momento.
  const esperandoG = useRef<number | null>(null);

  const abrirEmpezar = useCallback(() => {
    if (!sesion) setEmpezar(true);
    else setCerrar(true);
  }, [sesion]);

  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (esCampoDeTexto(e.target)) return;

      if (esperandoG.current !== null) {
        window.clearTimeout(esperandoG.current);
        esperandoG.current = null;
        if (e.key === "p") {
          e.preventDefault();
          router.push("/proyectos");
        }
        return;
      }
      if (e.key === "c") {
        e.preventDefault();
        setCaptura(true);
      } else if (e.key === "s") {
        e.preventDefault();
        abrirEmpezar();
      } else if (e.key === "g") {
        e.preventDefault();
        esperandoG.current = window.setTimeout(() => {
          esperandoG.current = null;
        }, 1200);
      }
    };
    window.addEventListener("keydown", alPulsar);
    return () => window.removeEventListener("keydown", alPulsar);
  }, [router, abrirEmpezar]);

  // Latido del cronómetro mientras la pestaña esté abierta con una
  // sesión activa. Vive aquí porque esta capa se monta una sola vez.
  useEffect(() => {
    if (!sesion) return;
    const id = window.setInterval(() => {
      void latidoDeSesionAction(sesion.id);
    }, INTERVALO_LATIDO);
    return () => window.clearInterval(id);
  }, [sesion]);

  useEffect(() => {
    const alCapturar = () => setCaptura(true);
    const alEmpezar = () => abrirEmpezar();
    const alCerrar = () => setCerrar(true);
    window.addEventListener(EVENTO_CAPTURAR, alCapturar);
    window.addEventListener(EVENTO_EMPEZAR, alEmpezar);
    window.addEventListener(EVENTO_CERRAR, alCerrar);
    return () => {
      window.removeEventListener(EVENTO_CAPTURAR, alCapturar);
      window.removeEventListener(EVENTO_EMPEZAR, alEmpezar);
      window.removeEventListener(EVENTO_CERRAR, alCerrar);
    };
  }, [abrirEmpezar]);

  return (
    <>
      <CapturaGlobal abierta={captura} onCerrar={() => setCaptura(false)} />
      <EmpezarSesion
        abierto={empezar}
        onCerrar={() => setEmpezar(false)}
        proyectos={proyectos}
        tareasVinculables={tareasVinculables}
      />
      {sesion ? (
        <CerrarSesion
          abierto={cerrar}
          onCerrar={() => setCerrar(false)}
          sesion={sesion}
          r3Activa={r3Activa}
        />
      ) : null}
      <NotaPendiente pendientes={pendientesDeNota} r3Activa={r3Activa} />
    </>
  );
}
