// Tarjeta de proyecto (documento 01, componentes clave): anillo orbital a
// la izquierda, nombre, cliente, el resultado comprometido de la semana y
// los contadores discretos. El color de acento solo tiñe el anillo y la
// barra lateral de 3px.

import Link from "next/link";
import { AnilloOrbital } from "./anillo-orbital";
import { haceDias } from "@/lib/formato";
import type { ResumenProyecto } from "@/lib/servicio-proyectos";

export function TarjetaProyecto({
  proyecto,
  indice = 0,
}: {
  proyecto: ResumenProyecto;
  indice?: number;
}) {
  const p = proyecto;
  return (
    <Link
      href={`/proyectos/${p.slug}`}
      className="relative block overflow-hidden rounded-lg border border-linea bg-superficie p-6 transition-colors duration-150 hover:border-tinta-tenue"
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ backgroundColor: p.colorAcento, opacity: p.estado === "activo" ? 1 : 0.35 }}
      />
      <div className="flex items-start gap-4">
        <AnilloOrbital
          id={p.slug}
          colorAcento={p.colorAcento}
          estado={p.estado}
          avance={p.avance}
          tamano={48}
          indice={indice}
          className="mt-1 shrink-0"
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[1.0625rem] font-semibold text-tinta">{p.nombre}</h2>
            {p.estado === "pausado" ? (
              <span className="rounded-full bg-papel-hondo px-2 py-0.5 text-[0.6875rem] font-medium tracking-[0.08em] text-tinta-media uppercase">
                En pausa
              </span>
            ) : null}
            {p.estado === "archivado" ? (
              <span className="rounded-full bg-papel-hondo px-2 py-0.5 text-[0.6875rem] font-medium tracking-[0.08em] text-tinta-media uppercase">
                Archivado
              </span>
            ) : null}
          </div>
          {p.cliente ? (
            <p className="mt-0.5 text-[0.8125rem] text-tinta-tenue">{p.cliente}</p>
          ) : null}
          <p className="mt-3 text-[0.9375rem] leading-[1.6] text-tinta-media">
            {p.resultadoComprometido ?? "Sin resultado comprometido esta semana."}
          </p>
        </div>
      </div>
      <dl className="mt-5 flex flex-wrap gap-x-6 gap-y-1 border-t border-linea pt-4">
        <div className="flex items-baseline gap-1.5">
          <dt className="t-micro text-tinta-tenue">Tareas abiertas</dt>
          <dd className="t-dato text-[0.875rem] text-tinta-media">{p.tareasAbiertas}</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="t-micro text-tinta-tenue">Sin leer</dt>
          <dd className="t-dato text-[0.875rem] text-tinta-media">{p.hallazgosSinLeer}</dd>
        </div>
        <div className="flex items-baseline gap-1.5">
          <dt className="t-micro text-tinta-tenue">Última sesión</dt>
          <dd className="t-dato text-[0.875rem] text-tinta">
            {p.ultimaSesion ? haceDias(p.ultimaSesion) : "sin sesiones"}
          </dd>
        </div>
      </dl>
    </Link>
  );
}
