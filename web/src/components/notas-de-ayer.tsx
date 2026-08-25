// Sección 3 de la pantalla Hoy: las notas de cierre de ayer, para
// retomar el contexto. Solo lectura: la nota ya se escribió al cerrar.

import type { NotaDeAyer } from "@/lib/servicio-hoy";

export function NotasDeAyer({ notas }: { notas: NotaDeAyer[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {notas.map((n) => (
        <li key={n.id} className="rounded-lg border border-linea bg-superficie p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <p className="text-[0.9375rem] font-semibold leading-[1.5] text-tinta">
              {n.intencion}
            </p>
            {n.duracionMin !== null ? (
              <span className="t-dato shrink-0 text-[0.875rem] text-tinta-tenue">
                {n.duracionMin} min
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span
              className="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium tracking-[0.08em] uppercase"
              style={{ backgroundColor: "var(--color-papel-hondo)", color: n.colorAcento }}
            >
              {n.proyectoNombre}
            </span>
            {n.abandonada ? (
              <span className="text-[0.8125rem] text-ambar">Quedó abandonada</span>
            ) : null}
          </p>
          <p className="mt-3 text-[0.9375rem] leading-[1.6] text-tinta-media">{n.avance}</p>
          {n.bloqueo ? (
            <p className="mt-1 text-[0.8125rem] leading-[1.5] text-ambar">Bloqueo: {n.bloqueo}</p>
          ) : null}
          {n.siguientePaso ? (
            <p className="mt-1 text-[0.8125rem] leading-[1.5] text-tinta-tenue">
              Siguiente paso: {n.siguientePaso}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
