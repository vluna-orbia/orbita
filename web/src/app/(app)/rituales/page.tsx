// Rituales (H4.1, H4.2): la puerta de los dos rituales de la semana. El
// lunes, la planificación en cuatro pasos; el viernes, la retrospectiva.
// Enseña en qué punto está cada uno y por dónde se retoma.

import Link from "next/link";
import { AvisoBanner } from "@/components/aviso-banner";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { planDeLaSemana } from "@/lib/servicio-rituales";
import { fechaCorta } from "@/lib/formato";

export const dynamic = "force-dynamic";

const AVISOS: Record<string, string> = {
  plan: "Semana montada. El plan queda guardado y se puede editar volviendo a entrar.",
  retro: "Retrospectiva guardada.",
  "retro-y-regla": "Retrospectiva guardada y regla añadida al Playbook.",
};

const PASOS = ["Triaje del inbox", "Proyectos activos", "Resultado de la semana", "Tareas de la semana"];

export default async function Rituales({
  searchParams,
}: {
  searchParams: Promise<{ hecho?: string }>;
}) {
  const { hecho } = await searchParams;
  const plan = await planDeLaSemana(prisma);
  const completado = plan?.completadoPaso ?? 0;
  const planHecho = completado >= 4;

  return (
    <>
      <h1 className="font-serif text-[2rem] leading-[1.15]">Rituales</h1>
      {plan ? (
        <p className="mt-2 font-mono text-[0.875rem] tabular-nums text-tinta-tenue">
          {`Semana del ${fechaCorta(plan.semanaInicio)}`}
        </p>
      ) : null}

      {hecho && AVISOS[hecho] ? (
        <div className="mt-6">
          <AvisoBanner tono="neutro">{AVISOS[hecho]}</AvisoBanner>
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section
          className="rounded-lg border border-linea bg-superficie p-8"
          aria-label="Planificación semanal"
        >
          <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Planificación semanal</h2>
          <p className="mt-2 text-[0.9375rem] leading-[1.6] text-tinta-media">
            El flujo del lunes: cuatro pasos y la semana montada en quince minutos. Se puede dejar
            a medias y retomar; el progreso se guarda paso a paso.
          </p>
          <ol className="mt-4 flex flex-col gap-1">
            {PASOS.map((titulo, i) => (
              <li key={titulo} className="flex items-center gap-3 text-[0.8125rem]">
                <span
                  className={`font-mono tabular-nums ${
                    completado > i ? "text-verde" : "text-tinta-tenue"
                  }`}
                >
                  {completado > i ? "hecho" : `paso ${i + 1}`}
                </span>
                <span className={completado > i ? "text-tinta-media" : "text-tinta"}>{titulo}</span>
              </li>
            ))}
          </ol>
          <div className="mt-6">
            <Button asChild size="sm" variant={planHecho ? "secondary" : "default"}>
              <Link href="/rituales/planificacion">
                {completado === 0
                  ? "Empezar la planificación"
                  : planHecho
                    ? "Editar la planificación"
                    : `Retomar en el paso ${Math.min(4, completado + 1)}`}
              </Link>
            </Button>
          </div>
        </section>

        <section
          className="rounded-lg border border-linea bg-superficie p-8"
          aria-label="Retrospectiva semanal"
        >
          <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Retrospectiva</h2>
          <p className="mt-2 text-[0.9375rem] leading-[1.6] text-tinta-media">
            El cierre del viernes: cada resultado comprometido a cumplido o no cumplido, las
            métricas reales de la semana y qué cambio pruebas la siguiente.
          </p>
          <p className="mt-4 text-[0.8125rem] text-tinta-tenue">
            {plan
              ? plan.retroHecha
                ? "Guardada. Se puede reeditar hasta que acabe la semana."
                : "Pendiente esta semana."
              : "Necesita la planificación de la semana: la retro revisa lo comprometido."}
          </p>
          <div className="mt-6">
            {plan ? (
              <Button asChild size="sm" variant={plan.retroHecha ? "secondary" : "default"}>
                <Link href="/rituales/retrospectiva">
                  {plan.retroHecha ? "Editar la retrospectiva" : "Hacer la retrospectiva"}
                </Link>
              </Button>
            ) : (
              <Button asChild size="sm" variant="secondary">
                <Link href="/rituales/planificacion">Antes, la planificación</Link>
              </Button>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
