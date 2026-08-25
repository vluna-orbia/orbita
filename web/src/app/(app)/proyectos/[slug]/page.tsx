// Detalle de proyecto: cabecera con el anillo, el brief vivo con sus seis
// secciones, el aviso de derivación (H1.2) y las decisiones abiertas con
// su cierre (adenda 04).

import Link from "next/link";
import { notFound } from "next/navigation";
import { AnilloOrbital } from "@/components/anillo-orbital";
import { AvisoBanner } from "@/components/aviso-banner";
import { DecisionesAbiertas } from "@/components/decisiones-abiertas";
import { EstadoVacio } from "@/components/estado-vacio";
import { Button } from "@/components/ui/button";
import { fechaConHora } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { mensajeLimiteAlActivar } from "@/lib/proyectos";
import {
  briefCambioDesdeDerivacion,
  decisionesAbiertas,
  limiteDeActivos,
  resumenDeProyecto,
  umbralDiasR6,
} from "@/lib/servicio-proyectos";
import { cambiarEstadoAction } from "../acciones";

export const dynamic = "force-dynamic";

const ORDEN_SECCIONES: { clave: string; titulo: string }[] = [
  { clave: "contexto", titulo: "Contexto" },
  { clave: "objetivos", titulo: "Objetivos" },
  { clave: "requerimientos", titulo: "Requerimientos" },
  { clave: "stack", titulo: "Stack" },
  { clave: "decisiones_abiertas", titulo: "Decisiones abiertas" },
  { clave: "riesgos", titulo: "Riesgos" },
];

function BotonEstado({
  slug,
  destino,
  texto,
  variante = "secondary",
}: {
  slug: string;
  destino: string;
  texto: string;
  variante?: "secondary" | "ghost";
}) {
  return (
    <form action={cambiarEstadoAction}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="destino" value={destino} />
      <Button type="submit" variant={variante} size="sm">
        {texto}
      </Button>
    </form>
  );
}

export default async function DetalleProyecto({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ aviso?: string; brief?: string; decision?: string }>;
}) {
  const { slug } = await params;
  const { aviso, brief: avisoBrief, decision: avisoDecision } = await searchParams;

  const proyecto = await resumenDeProyecto(prisma, slug);
  if (!proyecto) notFound();

  const [ultimaVersion, totalVersiones, decisiones, umbral, limite] = await Promise.all([
    prisma.projectBrief.findFirst({
      where: { project_id: proyecto.id },
      orderBy: { version: "desc" },
    }),
    prisma.projectBrief.count({ where: { project_id: proyecto.id } }),
    decisionesAbiertas(prisma, proyecto.id),
    umbralDiasR6(prisma),
    limiteDeActivos(prisma),
  ]);

  const avisoDerivacion = ultimaVersion
    ? await briefCambioDesdeDerivacion(prisma, proyecto.id)
    : false;

  const secciones = (ultimaVersion?.secciones ?? {}) as Record<string, string>;

  return (
    <>
      <p className="t-micro text-tinta-tenue">
        <Link href="/proyectos" className="hover:text-tinta">
          Proyectos
        </Link>
      </p>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-5">
          <AnilloOrbital
            id={`detalle-${proyecto.slug}`}
            colorAcento={proyecto.colorAcento}
            estado={proyecto.estado}
            avance={proyecto.avance}
            tamano={88}
            className="mt-1 shrink-0"
          />
          <div>
            <h1 className="font-serif text-[2rem] leading-[1.15]">{proyecto.nombre}</h1>
            <p className="mt-1 text-[0.9375rem] text-tinta-tenue">
              {proyecto.cliente ?? "Sin cliente"}
              {" · "}
              {proyecto.estado === "activo"
                ? "Activo"
                : proyecto.estado === "pausado"
                  ? "En pausa"
                  : "Archivado"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href={`/proyectos/${proyecto.slug}/editar`}>Editar</Link>
          </Button>
          {proyecto.estado === "activo" ? (
            <BotonEstado slug={proyecto.slug} destino="pausado" texto="Pausar" />
          ) : null}
          {proyecto.estado === "pausado" ? (
            <BotonEstado slug={proyecto.slug} destino="activo" texto="Activar" />
          ) : null}
          {proyecto.estado !== "archivado" ? (
            <BotonEstado slug={proyecto.slug} destino="archivado" texto="Archivar" variante="ghost" />
          ) : (
            <BotonEstado slug={proyecto.slug} destino="pausado" texto="Recuperar a pausa" />
          )}
        </div>
      </div>

      <div className="mt-6 flex max-w-[68ch] flex-col gap-3">
        {aviso === "limite-activar" ? (
          <AvisoBanner>{mensajeLimiteAlActivar(limite ?? 3)}</AvisoBanner>
        ) : null}
        {avisoBrief === "igual" ? (
          <AvisoBanner tono="neutro">
            Sin cambios reales en el contenido: no se ha creado versión nueva.
          </AvisoBanner>
        ) : null}
        {avisoBrief?.startsWith("v") ? (
          <AvisoBanner tono="neutro">Versión {avisoBrief.slice(1)} del brief guardada.</AvisoBanner>
        ) : null}
        {avisoDecision === "cerrada" ? (
          <AvisoBanner tono="neutro">Decisión cerrada, con su opción y su motivo registrados.</AvisoBanner>
        ) : null}
      </div>

      <p className="mt-6 max-w-[68ch] text-[1.0625rem] leading-[1.65] text-tinta-media">
        {proyecto.objetivo}
      </p>

      {proyecto.resultadoComprometido ? (
        <p className="mt-3 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta">
          <span className="t-micro text-tinta-tenue">Resultado de la semana</span>{" "}
          {proyecto.resultadoComprometido}{" "}
          <span className="t-dato text-[0.875rem] text-tinta-media">
            ({proyecto.tareasSemanaCompletadas} de {proyecto.tareasSemanaTotales} tareas)
          </span>
        </p>
      ) : (
        <p className="mt-3 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-tenue">
          Sin resultado comprometido esta semana: el anillo queda abierto.
        </p>
      )}

      {avisoDerivacion ? (
        <div className="mt-6 max-w-[68ch] rounded-lg bg-coral-velo p-4">
          <p className="text-[0.9375rem] leading-[1.6] text-tinta">
            El brief cambió desde la última derivación de intents.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" disabled>
              Regenerar intents
            </Button>
            <p className="text-[0.8125rem] text-tinta-media">
              La derivación llega con el motor de investigación (encargo 6).
            </p>
          </div>
        </div>
      ) : null}

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Brief vivo</h2>
          {ultimaVersion ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="t-dato text-[0.875rem] text-tinta-tenue">
                v{ultimaVersion.version} · {fechaConHora(ultimaVersion.created_at)} ·{" "}
                {ultimaVersion.content_hash.slice(0, 8)}
              </p>
              <Button asChild variant="secondary" size="sm">
                <Link href={`/proyectos/${proyecto.slug}/brief`}>Editar brief</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href={`/proyectos/${proyecto.slug}/versiones`}>
                  Historial ({totalVersiones})
                </Link>
              </Button>
            </div>
          ) : null}
        </div>

        {ultimaVersion ? (
          <div className="mt-4 max-w-[68ch] rounded-lg border border-linea bg-superficie p-8">
            {ORDEN_SECCIONES.filter((s) => (secciones[s.clave] ?? "").trim() !== "").map(
              (s, i) => (
                <section key={s.clave} className={i === 0 ? undefined : "mt-6"}>
                  <h3 className="t-micro text-tinta-tenue">{s.titulo}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-[0.9375rem] leading-[1.6] text-tinta">
                    {secciones[s.clave]}
                  </p>
                </section>
              )
            )}
          </div>
        ) : (
          <EstadoVacio pista="El brief alimenta al radar: seis secciones fijas, de contexto a riesgos.">
            Este proyecto todavía no tiene brief. Escribirlo es lo que lo convierte en fuente de
            verdad.{" "}
            <Link
              href={`/proyectos/${proyecto.slug}/brief`}
              className="font-medium text-tinta underline underline-offset-4"
            >
              Escribir el brief
            </Link>
          </EstadoVacio>
        )}
      </section>

      <section className="mt-12 max-w-[68ch]">
        <h2 className="text-[1.25rem] font-semibold leading-[1.3]">
          Decisiones abiertas{" "}
          <span className="t-dato text-[0.875rem] font-normal text-tinta-tenue">
            {decisiones.length}
          </span>
        </h2>
        <DecisionesAbiertas decisiones={decisiones} slug={proyecto.slug} umbralDias={umbral} />
      </section>
    </>
  );
}
