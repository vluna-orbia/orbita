"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleDashed, Plus, Radar, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { EVENTO_CAPTURAR } from "./capa-global";

// En móvil el lateral colapsa a una barra inferior con cuatro destinos:
// Hoy, Proyectos, Radar, Capturar. Capturar abre el campo de captura al
// inbox (H2.1), el mismo que la tecla c (DUDA 8 resuelta).
const DESTINOS = [
  { href: "/hoy", etiqueta: "Hoy", Icono: Sun },
  { href: "/proyectos", etiqueta: "Proyectos", Icono: CircleDashed },
  { href: "/radar", etiqueta: "Radar", Icono: Radar },
];

export function BarraMovil() {
  const ruta = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-linea bg-papel pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {DESTINOS.map((d) => {
        const activo = ruta === d.href || ruta.startsWith(d.href + "/");
        return (
          <Link
            key={d.etiqueta}
            href={d.href}
            aria-current={activo ? "page" : undefined}
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-1",
              activo ? "text-tinta" : "text-tinta-tenue"
            )}
          >
            <d.Icono size={20} strokeWidth={1.75} aria-hidden="true" />
            <span className="t-micro">{d.etiqueta}</span>
          </Link>
        );
      })}
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_CAPTURAR))}
        className="flex min-h-[56px] flex-col items-center justify-center gap-1 text-tinta-tenue"
      >
        <Plus size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="t-micro">Capturar</span>
      </button>
    </nav>
  );
}
