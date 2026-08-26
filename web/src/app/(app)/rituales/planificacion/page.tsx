// Planificación semanal guiada (H4.1): cuatro pasos, uno por pantalla,
// con retroceso libre hasta donde se haya llegado. El progreso se guarda
// paso a paso y el ritual se puede abandonar y retomar. Si la semana ya
// tiene plan, se abre en modo edición y no se duplica. Las reglas propias
// del Playbook aparecen como recordatorio en el paso de su categoría.

import Link from "next/link";
import { AvisoBanner } from "@/components/aviso-banner";
import { PasoProyectos } from "@/components/ritual/paso-proyectos";
import { PasoResultados } from "@/components/ritual/paso-resultados";
import { PasoTareas } from "@/components/ritual/paso-tareas";
import { PasoTriaje } from "@/components/ritual/paso-triaje";
import { prisma } from "@/lib/prisma";
import { limiteDeActivos } from "@/lib/servicio-proyectos";
import { recordatoriosDelPlaybook, type ReglaVigente } from "@/lib/servicio-playbook";
import {
  elementosDelInbox,
  planDeLaSemana,
  proyectosElegibles,
  tareasParaPaso4,
} from "@/lib/servicio-rituales";
import { fechaCorta } from "@/lib/formato";

export const dynamic = "force-dynamic";

const TITULOS = [
  "Triaje del inbox",
  "Proyectos activos",
  "Resultado de la semana",
  "Tareas de la semana",
];

// Categoría del playbook cuyos recordatorios tocan en cada paso.
const CATEGORIA_DEL_PASO: Record<number, string> = {
  1: "captura",
  2: "foco",
  4: "ejecución",
};

function Recordatorios({ reglas, paso }: { reglas: ReglaVigente[]; paso: number }) {
  const delPaso = reglas.filter((r) => r.categoria === CATEGORIA_DEL_PASO[paso]);
  if (delPaso.length === 0) return null;
  return (
    <div className="mt-4 flex flex-col gap-2">
      {delPaso.map((r) => (
        <AvisoBanner key={r.clave} tono="neutro">
          {`Recordatorio del playbook (${r.clave}): ${r.texto}`}
        </AvisoBanner>
      ))}
    </div>
  );
}

export default async function Planificacion({
  searchParams,
}: {
  searchParams: Promise<{ paso?: string }>;
}) {
  const { paso: pasoPedido } = await searchParams;
  const plan = await planDeLaSemana(prisma);
  const completado = plan?.completadoPaso ?? 0;
  const enEdicion = completado >= 4;
  // Hasta dónde se puede llegar: el paso siguiente al último completado.
  // En edición se entra por el principio; a medias, por donde se dejó.
  const alcanzable = enEdicion ? 4 : Math.min(4, completado + 1);
  const porDefecto = enEdicion ? 1 : alcanzable;
  const numero = Number(pasoPedido);
  const paso = Number.isInteger(numero) ? Math.max(1, Math.min(alcanzable, numero)) : porDefecto;

  const recordatorios = (await recordatoriosDelPlaybook(prisma)).filter((r) =>
    Object.values(CATEGORIA_DEL_PASO).includes(r.categoria)
  );

  return (
    <>
      <p className="t-micro text-tinta-tenue">
        <Link href="/rituales" className="hover:underline">
          Rituales
        </Link>{" "}
        / Planificación semanal
      </p>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-[2rem] leading-[1.15]">{TITULOS[paso - 1]}</h1>
        <span className="font-mono text-[0.875rem] tabular-nums text-tinta-tenue">
          {`Paso ${paso} de 4`}
        </span>
      </div>
      {plan ? (
        <p className="mt-2 text-[0.8125rem] text-tinta-tenue">
          {`Semana del ${fechaCorta(plan.semanaInicio)}`}
          {enEdicion ? " · la semana ya está montada: estás editando el plan" : ""}
        </p>
      ) : null}

      <nav aria-label="Pasos del ritual" className="mt-6 flex flex-wrap gap-2">
        {TITULOS.map((titulo, i) => {
          const n = i + 1;
          const alcanzado = n <= alcanzable;
          const actual = n === paso;
          const clase = actual
            ? "border-tinta text-tinta"
            : alcanzado
              ? "border-linea text-tinta-media hover:bg-papel-hondo"
              : "border-linea text-tinta-tenue";
          return alcanzado && !actual ? (
            <Link
              key={titulo}
              href={`/rituales/planificacion?paso=${n}`}
              className={`rounded-full border px-3 py-1 text-[0.8125rem] ${clase}`}
            >
              {`${n} · ${titulo}`}
            </Link>
          ) : (
            <span
              key={titulo}
              aria-current={actual ? "step" : undefined}
              className={`rounded-full border px-3 py-1 text-[0.8125rem] ${clase}`}
            >
              {`${n} · ${titulo}`}
            </span>
          );
        })}
      </nav>

      <Recordatorios reglas={recordatorios} paso={paso} />

      <section className="mt-6" aria-label={TITULOS[paso - 1]}>
        {paso === 1 ? (
          <PasoTriaje
            elementos={(await elementosDelInbox(prisma)).map((e) => ({
              id: e.id,
              titulo: e.titulo,
              proyectoSlug: e.proyectoSlug,
            }))}
            proyectos={(await proyectosElegibles(prisma)).map((p) => ({
              slug: p.slug,
              nombre: p.nombre,
              estado: p.estado,
            }))}
          />
        ) : null}

        {paso === 2 ? (
          <PasoProyectos
            proyectos={(await proyectosElegibles(prisma)).map((p) => ({
              slug: p.slug,
              nombre: p.nombre,
              cliente: p.cliente,
              colorAcento: p.colorAcento,
              estado: p.estado,
              cuentaParaLimite: p.cuentaParaLimite,
            }))}
            seleccionInicial={
              plan && plan.proyectosActivos.length > 0
                ? plan.proyectosActivos
                : (await proyectosElegibles(prisma))
                    .filter((p) => p.estado === "activo")
                    .map((p) => p.slug)
            }
            limite={await limiteDeActivos(prisma)}
          />
        ) : null}

        {paso === 3 && plan ? (
          <PasoResultados
            resultados={await Promise.all(
              plan.proyectosActivos.map(async (slug) => {
                const proyecto = await prisma.project.findUnique({ where: { slug } });
                const existente = plan.resultados.find((r) => r.proyectoSlug === slug);
                return {
                  slug,
                  nombre: proyecto?.nombre ?? slug,
                  colorAcento: proyecto?.color_acento ?? "#5B6B73",
                  descripcion: existente?.descripcion ?? "",
                };
              })
            )}
          />
        ) : null}

        {paso === 4 ? <PasoTareas proyectos={await tareasParaPaso4(prisma)} /> : null}
      </section>
    </>
  );
}
