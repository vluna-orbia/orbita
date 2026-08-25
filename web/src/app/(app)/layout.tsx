// Layout de la aplicación (encargo 4): además del lateral y la barra
// móvil, monta la capa global de captura y sesiones. La sesión activa se
// lee del servidor en cada render: el cronómetro sobrevive a recargas y
// las huérfanas se detectan al entrar.

import { BarraMovil } from "@/components/barra-movil";
import { CapaGlobal } from "@/components/capa-global";
import { SesionMovil } from "@/components/cronometro-sesion";
import { Lateral } from "@/components/lateral";
import { prisma } from "@/lib/prisma";
import { r3Activa, sesionActiva, sesionesPendientesDeNota } from "@/lib/servicio-sesiones";

export const dynamic = "force-dynamic";

export default async function LayoutAplicacion({ children }: { children: React.ReactNode }) {
  const [sesion, pendientes, r3, proyectos, tareas] = await Promise.all([
    sesionActiva(prisma),
    sesionesPendientesDeNota(prisma),
    r3Activa(prisma),
    prisma.project.findMany({
      where: { estado: { in: ["activo", "pausado"] } },
      select: { id: true, nombre: true, slug: true, estado: true },
      orderBy: { orden: "asc" },
    }),
    prisma.task.findMany({
      where: { estado: { in: ["semana", "en_curso"] }, project_id: { not: null } },
      select: { id: true, titulo: true, project: { select: { slug: true } } },
      orderBy: { created_at: "asc" },
    }),
  ]);

  const proyectosGlobales = proyectos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    slug: p.slug,
    estado: p.estado as "activo" | "pausado",
  }));
  const tareasVinculables = tareas
    .filter((t) => t.project)
    .map((t) => ({ id: t.id, titulo: t.titulo, proyectoSlug: t.project!.slug }));

  return (
    <div className="min-h-screen">
      <Lateral sesion={sesion} />
      <BarraMovil />
      <SesionMovil sesion={sesion} />
      <CapaGlobal
        proyectos={proyectosGlobales}
        tareasVinculables={tareasVinculables}
        sesion={sesion}
        pendientesDeNota={pendientes}
        r3Activa={r3}
      />
      <main className={sesion ? "pt-[52px] md:pl-[216px] md:pt-0" : "md:pl-[216px]"}>
        <div className="mx-auto w-full max-w-[1180px] px-6 pb-24 pt-12 md:px-8">{children}</div>
      </main>
    </div>
  );
}
