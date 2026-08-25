"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SesionLateral } from "./cronometro-sesion";
import type { SesionActiva } from "@/lib/servicio-sesiones";

const DESTINOS = [
  { href: "/hoy", etiqueta: "Hoy" },
  { href: "/proyectos", etiqueta: "Proyectos" },
  { href: "/tareas", etiqueta: "Tareas" },
  { href: "/radar", etiqueta: "Radar" },
  { href: "/rituales", etiqueta: "Rituales" },
  { href: "/playbook", etiqueta: "Playbook" },
];

// Lateral de 216px con la navegación principal y el cronómetro de sesión
// (encargo 4): visible en todas las pantallas mientras haya sesión.
export function Lateral({ sesion }: { sesion: SesionActiva | null }) {
  const ruta = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[216px] flex-col border-r border-linea bg-papel px-4 py-6 md:flex">
      <div className="px-3 pb-8">
        <Link href="/hoy" className="text-[1.0625rem] font-semibold tracking-[0.01em] text-tinta">
          Órbita
        </Link>
      </div>
      <nav aria-label="Principal" className="flex flex-col gap-1">
        {DESTINOS.map((d) => {
          const activo = ruta === d.href || ruta.startsWith(d.href + "/");
          return (
            <Link
              key={d.href}
              href={d.href}
              aria-current={activo ? "page" : undefined}
              className={cn(
                "rounded-[6px] px-3 py-2 text-[0.9375rem] font-medium transition-colors duration-150",
                activo
                  ? "bg-papel-hondo text-tinta"
                  : "text-tinta-media hover:bg-papel-hondo hover:text-tinta"
              )}
            >
              {d.etiqueta}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3">
        <SesionLateral sesion={sesion} />
      </div>
    </aside>
  );
}
