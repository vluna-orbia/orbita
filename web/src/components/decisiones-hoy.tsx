// Sección 4 de la pantalla Hoy: decisiones abiertas por encima del
// umbral de la regla R6, con quién las bloquea (adenda 04: la lista de a
// quién hay que perseguir). El cierre vive en el detalle del proyecto;
// cada título lleva allí.

import Link from "next/link";
import type { DecisionSobreUmbral } from "@/lib/servicio-hoy";

export function DecisionesHoy({ decisiones }: { decisiones: DecisionSobreUmbral[] }) {
  return (
    <ul className="mt-4 flex flex-col gap-2">
      {decisiones.map((d) => (
        <li
          key={d.id}
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-linea bg-superficie px-4 py-3"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <Link
                href={`/proyectos/${d.proyectoSlug}`}
                className="text-[0.9375rem] font-medium leading-[1.5] text-tinta hover:underline hover:underline-offset-4"
              >
                {d.titulo}
              </Link>
              <span
                className="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium tracking-[0.08em] uppercase"
                style={{ backgroundColor: "var(--color-papel-hondo)", color: d.colorAcento }}
              >
                {d.proyectoNombre}
              </span>
            </div>
            {d.bloqueadoPor ? (
              <p className="mt-1 text-[0.8125rem] leading-[1.5] text-tinta-media">
                <span className="t-micro text-tinta-tenue">Bloquea</span> {d.bloqueadoPor}
              </p>
            ) : null}
          </div>
          <span className="t-dato shrink-0 text-[0.875rem] text-ambar">
            {d.diasAbierta} {d.diasAbierta === 1 ? "día" : "días"}
          </span>
        </li>
      ))}
    </ul>
  );
}
