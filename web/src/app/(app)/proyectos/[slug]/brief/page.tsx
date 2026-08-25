// Editor del brief vivo (H1.2).

import Link from "next/link";
import { notFound } from "next/navigation";
import { FormularioBrief } from "@/components/formulario-brief";
import { prisma } from "@/lib/prisma";

const PLANTILLA = `## Contexto

## Objetivos

## Requerimientos

## Stack

## Decisiones abiertas

## Riesgos
`;

export default async function EditarBrief({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const proyecto = await prisma.project.findUnique({ where: { slug } });
  if (!proyecto) notFound();

  const ultima = await prisma.projectBrief.findFirst({
    where: { project_id: proyecto.id },
    orderBy: { version: "desc" },
  });

  return (
    <>
      <p className="t-micro text-tinta-tenue">
        <Link href={`/proyectos/${proyecto.slug}`} className="hover:text-tinta">
          Proyectos · {proyecto.nombre}
        </Link>
      </p>
      <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">Brief vivo</h1>
      <p className="mt-2 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-media">
        {ultima
          ? `Editas sobre la versión ${ultima.version}. Al guardar con cambios se crea la ${ultima.version + 1}.`
          : "Primera versión del brief. Es la fuente de verdad del proyecto y alimentará al radar."}
      </p>
      <FormularioBrief slug={proyecto.slug} contenidoInicial={ultima?.contenido_md ?? PLANTILLA} />
    </>
  );
}
