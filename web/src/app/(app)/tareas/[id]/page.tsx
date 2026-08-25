// Detalle de tarea (H2.2, H2.4, H2.5): los campos editables, el bloqueo
// con su motivo y el log de transiciones, visible aquí como pide la
// historia. Cada transición queda registrada con su marca de tiempo.

import Link from "next/link";
import { notFound } from "next/navigation";
import { BloqueoTarea } from "@/components/bloqueo-tarea";
import { FilaTarea } from "@/components/fila-tarea";
import { FormularioTarea } from "@/components/formulario-tarea";
import { fechaConHora } from "@/lib/formato";
import { prisma } from "@/lib/prisma";
import { detalleDeTarea } from "@/lib/servicio-tareas";
import { NOMBRE_ESTADO, type EstadoTarea } from "@/lib/tareas";

export const dynamic = "force-dynamic";

function fechaComoValorDeCampo(fecha: Date | null): string {
  if (!fecha) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: "UTC" }).format(fecha);
}

export default async function DetalleTarea({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ guardada?: string }>;
}) {
  const { id } = await params;
  const { guardada } = await searchParams;
  const [tarea, proyectos] = await Promise.all([
    detalleDeTarea(prisma, id),
    prisma.project.findMany({
      where: { estado: { in: ["activo", "pausado"] } },
      select: { nombre: true, slug: true },
      orderBy: { orden: "asc" },
    }),
  ]);
  if (!tarea) notFound();

  // Candidatas a bloqueante: tareas abiertas que no sean esta.
  const candidatas = await prisma.task.findMany({
    where: {
      id: { not: tarea.id },
      estado: { in: ["inbox", "backlog", "semana", "en_curso"] },
    },
    select: { id: true, titulo: true },
    orderBy: { created_at: "desc" },
    take: 50,
  });

  return (
    <>
      <nav aria-label="Migas" className="text-[0.8125rem] text-tinta-tenue">
        <Link href="/tareas" className="hover:text-tinta hover:underline hover:underline-offset-4">
          Tareas
        </Link>{" "}
        / {NOMBRE_ESTADO[tarea.estado as EstadoTarea]}
      </nav>
      <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">{tarea.titulo}</h1>

      {guardada ? (
        <p role="status" className="mt-3 text-[0.8125rem] text-verde">
          Cambios guardados.
        </p>
      ) : null}

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <section aria-label="Estado">
            <h2 className="text-[1.25rem] font-semibold leading-[1.3] text-tinta">Estado</h2>
            <ul className="mt-3">
              <FilaTarea
                tarea={{
                  id: tarea.id,
                  titulo: tarea.titulo,
                  estado: tarea.estado as EstadoTarea,
                  prioridad: tarea.prioridad,
                  estimacionMin: tarea.estimacion_min,
                  venceEl: tarea.vence_el,
                  siguientePaso: tarea.siguiente_paso,
                  motivoBloqueo: tarea.motivo_bloqueo,
                  proyectoNombre: tarea.project?.nombre ?? null,
                  proyectoSlug: tarea.project?.slug ?? null,
                  colorAcento: tarea.project?.color_acento ?? null,
                  origen: tarea.origen,
                }}
              />
            </ul>
            <BloqueoTarea
              tareaId={tarea.id}
              motivoActual={tarea.motivo_bloqueo}
              bloqueanteActual={tarea.bloqueante}
              candidatas={candidatas}
            />
          </section>

          <section aria-label="Campos" className="mt-8">
            <h2 className="text-[1.25rem] font-semibold leading-[1.3] text-tinta">Campos</h2>
            <FormularioTarea
              valores={{
                id: tarea.id,
                titulo: tarea.titulo,
                notas: tarea.notas ?? "",
                proyectoSlug: tarea.project?.slug ?? "",
                prioridad: tarea.prioridad,
                estimacionMin: tarea.estimacion_min,
                venceEl: fechaComoValorDeCampo(tarea.vence_el),
                siguientePaso: tarea.siguiente_paso ?? "",
              }}
              proyectos={proyectos}
            />
          </section>
        </div>

        <aside aria-label="Historial de la tarea">
          <h2 className="text-[1.25rem] font-semibold leading-[1.3] text-tinta">Historial</h2>
          <ol className="mt-3 flex flex-col gap-2">
            {tarea.events.map((e) => (
              <li key={e.id} className="rounded-lg border border-linea bg-superficie px-4 py-2.5">
                <p className="text-[0.9375rem] text-tinta">
                  {e.estado_anterior
                    ? `${NOMBRE_ESTADO[e.estado_anterior as EstadoTarea]} → ${NOMBRE_ESTADO[e.estado_nuevo as EstadoTarea]}`
                    : `Creada en ${NOMBRE_ESTADO[e.estado_nuevo as EstadoTarea].toLowerCase()}`}
                </p>
                <p className="t-dato mt-0.5 text-[0.8125rem] text-tinta-tenue">
                  {fechaConHora(e.created_at)}
                </p>
              </li>
            ))}
          </ol>
          {tarea.completed_at ? (
            <p className="t-dato mt-3 text-[0.8125rem] text-tinta-tenue">
              Completada el {fechaConHora(tarea.completed_at)}
            </p>
          ) : null}
          {tarea.origen !== "manual" ? (
            <p className="mt-2 text-[0.8125rem] text-tinta-tenue">Origen: {tarea.origen}</p>
          ) : null}
        </aside>
      </div>
    </>
  );
}
