// Editar nombre, cliente y objetivo (H1.1). El slug no cambia: las URLs
// y el engine dependen de él.

import { notFound } from "next/navigation";
import { FormularioProyecto } from "@/components/formulario-proyecto";
import { prisma } from "@/lib/prisma";
import { actualizarProyectoAction } from "../../acciones";

export default async function EditarProyecto({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const proyecto = await prisma.project.findUnique({ where: { slug } });
  if (!proyecto) notFound();

  return (
    <>
      <p className="t-micro text-tinta-tenue">Proyectos · {proyecto.nombre}</p>
      <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">Editar proyecto</h1>
      <FormularioProyecto
        action={actualizarProyectoAction}
        textoEnviar="Guardar cambios"
        slug={proyecto.slug}
        valores={{
          nombre: proyecto.nombre,
          cliente: proyecto.cliente ?? "",
          objetivo: proyecto.objetivo,
        }}
      />
    </>
  );
}
