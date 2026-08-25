// Historial de versiones del brief y comparación entre dos cualesquiera
// (H1.2). La comparación va por parámetros de URL: enlazable y sin estado
// de cliente.

import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { diffLineas } from "@/lib/diff";
import { fechaConHora } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function VersionesBrief({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const { slug } = await params;
  const { a, b } = await searchParams;

  const proyecto = await prisma.project.findUnique({ where: { slug } });
  if (!proyecto) notFound();

  const versiones = await prisma.projectBrief.findMany({
    where: { project_id: proyecto.id },
    orderBy: { version: "desc" },
  });

  if (versiones.length === 0) {
    return (
      <>
        <p className="t-micro text-tinta-tenue">
          <Link href={`/proyectos/${proyecto.slug}`} className="hover:text-tinta">
            Proyectos · {proyecto.nombre}
          </Link>
        </p>
        <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">Versiones del brief</h1>
        <p className="mt-6 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-media">
          Este proyecto todavía no tiene brief, así que no hay versiones que comparar.
        </p>
      </>
    );
  }

  // Por defecto se comparan las dos últimas; con una sola, consigo misma.
  const numeroA = Number(a) || (versiones.length > 1 ? versiones[1].version : versiones[0].version);
  const numeroB = Number(b) || versiones[0].version;
  const versionA = versiones.find((v) => v.version === numeroA);
  const versionB = versiones.find((v) => v.version === numeroB);

  const diff =
    versionA && versionB ? diffLineas(versionA.contenido_md, versionB.contenido_md) : [];
  const cambios = diff.filter((l) => l.tipo !== "igual").length;

  return (
    <>
      <p className="t-micro text-tinta-tenue">
        <Link href={`/proyectos/${proyecto.slug}`} className="hover:text-tinta">
          Proyectos · {proyecto.nombre}
        </Link>
      </p>
      <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">Versiones del brief</h1>

      <section className="mt-8 max-w-[68ch]">
        <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Historial</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {versiones.map((v) => (
            <li
              key={v.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-linea bg-superficie px-4 py-3"
            >
              <p className="text-[0.9375rem] font-medium text-tinta">{`Versión ${v.version}`}</p>
              <p className="t-dato text-[0.875rem] text-tinta-tenue">
                {fechaConHora(v.created_at)} · {v.content_hash.slice(0, 8)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Comparar</h2>
        <form method="get" className="mt-4 flex flex-wrap items-end gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
              Desde
            </span>
            <select
              name="a"
              defaultValue={numeroA}
              className="h-11 rounded-lg border border-linea bg-superficie px-3 text-[0.9375rem] text-tinta"
            >
              {versiones.map((v) => (
                <option key={v.id} value={v.version}>
                  {`Versión ${v.version}`}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
              Hasta
            </span>
            <select
              name="b"
              defaultValue={numeroB}
              className="h-11 rounded-lg border border-linea bg-superficie px-3 text-[0.9375rem] text-tinta"
            >
              {versiones.map((v) => (
                <option key={v.id} value={v.version}>
                  {`Versión ${v.version}`}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" variant="secondary">
            Comparar
          </Button>
        </form>

        {versionA && versionB ? (
          <div className="mt-6 max-w-[80ch] overflow-x-auto rounded-lg border border-linea bg-superficie">
            <p className="border-b border-linea bg-papel-hondo px-4 py-2 text-[0.8125rem] text-tinta-media">
              De la versión {versionA.version} a la {versionB.version}:{" "}
              <span className="t-dato">{cambios}</span>{" "}
              {cambios === 1 ? "línea cambiada" : "líneas cambiadas"}
            </p>
            <pre className="whitespace-pre-wrap px-4 py-3 font-mono text-[0.8125rem] leading-[1.7]">
              {diff.map((linea, i) => (
                <span
                  key={i}
                  className={cn(
                    "block",
                    linea.tipo === "anadida" && "bg-papel-hondo text-verde",
                    linea.tipo === "eliminada" && "text-rojo line-through decoration-1",
                    linea.tipo === "igual" && "text-tinta-media"
                  )}
                >
                  {linea.tipo === "anadida" ? "+ " : linea.tipo === "eliminada" ? "- " : "  "}
                  {linea.texto || " "}
                </span>
              ))}
            </pre>
          </div>
        ) : (
          <p className="mt-6 text-[0.9375rem] text-tinta-media">
            Esas versiones no existen en este proyecto.
          </p>
        )}
      </section>
    </>
  );
}
