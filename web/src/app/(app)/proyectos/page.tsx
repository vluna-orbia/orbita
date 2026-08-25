// Proyectos (H1.1, H1.3, H1.4): la lista con el anillo orbital de cada
// uno. Los archivados desaparecen de la vista principal y viven tras el
// filtro, con todos sus datos.

import Link from "next/link";
import { AvisoBanner } from "@/components/aviso-banner";
import { EstadoVacio } from "@/components/estado-vacio";
import { TarjetaProyecto } from "@/components/tarjeta-proyecto";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { mensajeCreadoEnPausa } from "@/lib/proyectos";
import { limiteDeActivos, resumenDeProyectos } from "@/lib/servicio-proyectos";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function Proyectos({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; enpausa?: string }>;
}) {
  const { filtro, enpausa } = await searchParams;
  const verArchivados = filtro === "archivados";

  const [proyectos, archivados, limite] = await Promise.all([
    resumenDeProyectos(prisma, { archivados: verArchivados }),
    prisma.project.count({ where: { estado: "archivado" } }),
    limiteDeActivos(prisma),
  ]);

  const enPausa = enpausa ? proyectos.find((p) => p.slug === enpausa) : null;

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="font-serif text-[2rem] leading-[1.15]">Proyectos</h1>
        <Button asChild>
          <Link href="/proyectos/nuevo">Nuevo proyecto</Link>
        </Button>
      </div>

      <div className="mt-4 flex gap-4">
        <Link
          href="/proyectos"
          aria-current={!verArchivados ? "page" : undefined}
          className={cn(
            "text-[0.8125rem] font-medium tracking-[0.02em]",
            !verArchivados ? "text-tinta underline underline-offset-4" : "text-tinta-tenue hover:text-tinta"
          )}
        >
          Activos y en pausa
        </Link>
        <Link
          href="/proyectos?filtro=archivados"
          aria-current={verArchivados ? "page" : undefined}
          className={cn(
            "text-[0.8125rem] font-medium tracking-[0.02em]",
            verArchivados ? "text-tinta underline underline-offset-4" : "text-tinta-tenue hover:text-tinta"
          )}
        >
          Archivados ({archivados})
        </Link>
      </div>

      {enPausa ? (
        <div className="mt-6">
          <AvisoBanner>{mensajeCreadoEnPausa(limite ?? 3)}</AvisoBanner>
        </div>
      ) : null}

      {proyectos.length === 0 ? (
        <EstadoVacio
          pista={
            verArchivados
              ? "Archivar un proyecto lo trae aquí con todos sus datos."
              : "Crea el primero con el botón de arriba. El anillo orbital se cierra con el avance de la semana."
          }
        >
          {verArchivados
            ? "No hay proyectos archivados."
            : "Todavía no hay proyectos. El primero tarda menos de un minuto: nombre y objetivo."}
        </EstadoVacio>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {proyectos.map((p, i) => (
            <TarjetaProyecto key={p.id} proyecto={p} indice={i} />
          ))}
        </div>
      )}
    </>
  );
}
