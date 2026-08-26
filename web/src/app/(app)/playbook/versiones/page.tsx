// Historial del Playbook (H5.2): todas las versiones, con fecha, motivo
// y qué cambió en cada una respecto a la anterior.

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { historialDeVersiones } from "@/lib/servicio-playbook";
import { fechaConHora } from "@/lib/formato";

export const dynamic = "force-dynamic";

export default async function VersionesDelPlaybook() {
  const historial = await historialDeVersiones(prisma);

  return (
    <>
      <p className="t-micro text-tinta-tenue">
        <Link href="/playbook" className="hover:underline">
          Playbook
        </Link>{" "}
        / Historial
      </p>
      <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">Historial de versiones</h1>
      <p className="mt-3 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-media">
        Cada cambio del Playbook crea una versión con su fecha y su motivo. Las validaciones leen
        siempre la última.
      </p>

      <ol className="mt-8 flex flex-col gap-3">
        {historial.map((version) => (
          <li key={version.version} className="rounded-lg border border-linea bg-superficie p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-mono text-[0.875rem] tabular-nums text-tinta">
                {`Versión ${version.version}`}
              </span>
              <span className="font-mono text-[0.6875rem] tabular-nums text-tinta-tenue">
                {fechaConHora(version.fecha)}
              </span>
            </div>
            <p className="mt-2 text-[0.9375rem] leading-[1.6] text-tinta">{version.motivo}</p>
            {version.cambios.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-1">
                {version.cambios.map((cambio) => (
                  <li key={cambio} className="text-[0.8125rem] leading-[1.5] text-tinta-media">
                    · {cambio}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-[0.8125rem] text-tinta-tenue">
                Sin cambios de reglas: versión administrativa.
              </p>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}
