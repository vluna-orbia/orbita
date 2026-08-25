// Tareas (H2.1 a H2.6): la vista filtrable con filtros persistidos en la
// URL, agrupada por estado o por proyecto, con la máquina de estados y el
// límite de WIP operando en cada fila. La captura vive en la tecla c y en
// el botón Capturar, desde cualquier pantalla.

import { EstadoVacio } from "@/components/estado-vacio";
import { FilaTarea } from "@/components/fila-tarea";
import { FiltrosTareas } from "@/components/filtros-tareas";
import { prisma } from "@/lib/prisma";
import {
  FILTROS_VENCIMIENTO,
  limiteWip,
  listaDeTareas,
  tareasEnCursoQueCuentan,
  type FiltroVencimiento,
  type TareaDeLista,
} from "@/lib/servicio-tareas";
import { esEstadoTarea, NOMBRE_ESTADO, type EstadoTarea } from "@/lib/tareas";

export const dynamic = "force-dynamic";

const ORDEN_ESTADOS: EstadoTarea[] = [
  "en_curso",
  "semana",
  "inbox",
  "backlog",
  "hecha",
  "descartada",
];

function agrupar(
  tareas: TareaDeLista[],
  criterio: "estado" | "proyecto"
): { clave: string; titulo: string; tareas: TareaDeLista[] }[] {
  if (criterio === "proyecto") {
    const grupos = new Map<string, { titulo: string; tareas: TareaDeLista[] }>();
    for (const t of tareas) {
      const clave = t.proyectoSlug ?? "sin-proyecto";
      const grupo = grupos.get(clave) ?? {
        titulo: t.proyectoNombre ?? "Sin proyecto",
        tareas: [],
      };
      grupo.tareas.push(t);
      grupos.set(clave, grupo);
    }
    return [...grupos.entries()]
      .sort((a, b) => a[1].titulo.localeCompare(b[1].titulo, "es"))
      .map(([clave, g]) => ({ clave, titulo: g.titulo, tareas: g.tareas }));
  }
  return ORDEN_ESTADOS.filter((e) => tareas.some((t) => t.estado === e)).map((e) => ({
    clave: e,
    titulo: NOMBRE_ESTADO[e],
    tareas: tareas.filter((t) => t.estado === e),
  }));
}

export default async function Tareas({
  searchParams,
}: {
  searchParams: Promise<{
    proyecto?: string;
    estado?: string;
    vencimiento?: string;
    agrupar?: string;
  }>;
}) {
  const parametros = await searchParams;
  const estado = parametros.estado && esEstadoTarea(parametros.estado) ? parametros.estado : undefined;
  const vencimiento = FILTROS_VENCIMIENTO.includes(parametros.vencimiento as FiltroVencimiento)
    ? (parametros.vencimiento as FiltroVencimiento)
    : undefined;
  const criterio = parametros.agrupar === "proyecto" ? "proyecto" : "estado";

  const [tareas, proyectos, limite, enCurso] = await Promise.all([
    listaDeTareas(prisma, { proyecto: parametros.proyecto, estado, vencimiento }),
    prisma.project.findMany({
      where: { estado: { in: ["activo", "pausado"] } },
      select: { nombre: true, slug: true },
      orderBy: { orden: "asc" },
    }),
    limiteWip(prisma),
    tareasEnCursoQueCuentan(prisma),
  ]);

  const grupos = agrupar(tareas, criterio);
  const hayFiltros = Boolean(parametros.proyecto || estado || vencimiento);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="font-serif text-[2rem] leading-[1.15]">Tareas</h1>
        <p className="t-dato text-[0.875rem] text-tinta-media">
          {limite !== null
            ? `En curso ${enCurso.length} de ${limite}`
            : `En curso ${enCurso.length}, sin límite: la regla R1 está desactivada`}
        </p>
      </div>

      <FiltrosTareas proyectos={proyectos} />

      {tareas.length === 0 ? (
        <EstadoVacio
          pista={
            hayFiltros
              ? "Prueba a quitar algún filtro: la vista guarda los filtros en la URL."
              : "Pulsa c desde cualquier pantalla y apunta lo que tengas en la cabeza. El límite de tres en curso lo aplica el servidor."
          }
        >
          {hayFiltros
            ? "Ninguna tarea coincide con estos filtros."
            : "Todavía no hay tareas abiertas. La captura tarda menos de tres segundos: tecla c, escribir y Enter."}
        </EstadoVacio>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          {grupos.map((grupo) => (
            <section key={grupo.clave} aria-label={grupo.titulo}>
              <div className="flex items-baseline gap-2">
                <h2 className="text-[1.25rem] font-semibold leading-[1.3] text-tinta">
                  {grupo.titulo}
                </h2>
                <span className="t-dato text-[0.875rem] text-tinta-tenue">
                  {grupo.tareas.length}
                </span>
              </div>
              <ul className="mt-3 flex flex-col gap-2">
                {grupo.tareas.map((t) => (
                  <FilaTarea key={t.id} tarea={t} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
