// Retrospectiva semanal (H4.2): cada resultado comprometido a cumplido o
// no cumplido, sin opción intermedia; las métricas de la semana
// calculadas de los datos, no simuladas; y los tres campos libres, con el
// botón que convierte qué cambio pruebo en regla del Playbook. Las cifras
// grandes van en serif, como manda el documento 01.

import Link from "next/link";
import { AvisoBanner } from "@/components/aviso-banner";
import { EstadoVacio } from "@/components/estado-vacio";
import { FormularioRetro } from "@/components/ritual/formulario-retro";
import { Button } from "@/components/ui/button";
import { marcarResultadoAction } from "@/app/(app)/rituales/acciones";
import { prisma } from "@/lib/prisma";
import { recordatoriosDelPlaybook } from "@/lib/servicio-playbook";
import { metricasDeLaSemana, planDeLaSemana } from "@/lib/servicio-rituales";
import { inicioDeSemana } from "@/lib/semana";
import { fechaCorta } from "@/lib/formato";

export const dynamic = "force-dynamic";

function Cifra({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-lg border border-linea bg-superficie p-6">
      <p className="font-serif text-[2rem] leading-[1.15] text-tinta tabular-nums">{valor}</p>
      <p className="t-micro mt-2 text-tinta-tenue">{etiqueta}</p>
    </div>
  );
}

export default async function Retrospectiva() {
  const plan = await planDeLaSemana(prisma);
  if (!plan) {
    return (
      <>
        <p className="t-micro text-tinta-tenue">
          <Link href="/rituales" className="hover:underline">
            Rituales
          </Link>{" "}
          / Retrospectiva
        </p>
        <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">Retrospectiva</h1>
        <EstadoVacio pista="La planificación semanal crea los resultados que la retro revisa.">
          Esta semana no tiene planificación. La retro necesita algo que revisar: monta antes la
          semana desde el ritual de planificación.
        </EstadoVacio>
      </>
    );
  }

  const [metricas, retro, recordatorios] = await Promise.all([
    metricasDeLaSemana(prisma),
    prisma.retro.findUnique({ where: { weekly_plan_id: plan.id } }),
    recordatoriosDelPlaybook(prisma),
  ]);
  const deRevision = recordatorios.filter((r) => r.categoria === "revisión");
  const horas = Math.floor(metricas.minutos / 60);
  const minutos = metricas.minutos % 60;

  return (
    <>
      <p className="t-micro text-tinta-tenue">
        <Link href="/rituales" className="hover:underline">
          Rituales
        </Link>{" "}
        / Retrospectiva
      </p>
      <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">Retrospectiva</h1>
      <p className="mt-2 text-[0.8125rem] text-tinta-tenue">
        {`Semana del ${fechaCorta(inicioDeSemana())}`}
      </p>

      {deRevision.length > 0 ? (
        <div className="mt-4 flex flex-col gap-2">
          {deRevision.map((r) => (
            <AvisoBanner key={r.clave} tono="neutro">
              {`Recordatorio del playbook (${r.clave}): ${r.texto}`}
            </AvisoBanner>
          ))}
        </div>
      ) : null}

      <section className="mt-8" aria-label="Resultados comprometidos">
        <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Resultados comprometidos</h2>
        {plan.resultados.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-2">
            {plan.resultados.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-linea bg-superficie p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-8 w-[3px] shrink-0 rounded-full"
                    style={{ backgroundColor: r.colorAcento }}
                  />
                  <div className="min-w-0">
                    <p className="text-[0.8125rem] text-tinta-tenue">{r.proyectoNombre}</p>
                    <p className="text-[0.9375rem] leading-[1.6] text-tinta">{r.descripcion}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <form action={marcarResultadoAction}>
                    <input type="hidden" name="resultado" value={r.id} />
                    <input type="hidden" name="cumplido" value="si" />
                    <Button
                      type="submit"
                      size="sm"
                      variant={r.cumplido === true ? "default" : "secondary"}
                    >
                      Cumplido
                    </Button>
                  </form>
                  <form action={marcarResultadoAction}>
                    <input type="hidden" name="resultado" value={r.id} />
                    <input type="hidden" name="cumplido" value="no" />
                    <Button
                      type="submit"
                      size="sm"
                      variant={r.cumplido === false ? "default" : "secondary"}
                    >
                      No cumplido
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-media">
            La semana no tiene resultados comprometidos. El paso 3 de la planificación los fija.
          </p>
        )}
      </section>

      <section className="mt-10" aria-label="Métricas de la semana">
        <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Métricas de la semana</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Cifra valor={String(metricas.tareasCompletadas)} etiqueta="tareas completadas" />
          <Cifra valor={String(metricas.sesiones)} etiqueta="sesiones registradas" />
          <Cifra
            valor={horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`}
            etiqueta="minutos trabajados"
          />
          <Cifra valor={`${metricas.porcentajeConNota}%`} etiqueta="sesiones con nota" />
          <Cifra
            valor={String(metricas.intentosDeSaltarWip)}
            etiqueta="intentos de saltar el WIP"
          />
        </div>
      </section>

      <section className="mt-10" aria-label="La retro">
        <h2 className="text-[1.25rem] font-semibold leading-[1.3]">La retro</h2>
        <FormularioRetro
          valores={{
            queFunciono: retro?.que_funciono ?? "",
            queNo: retro?.que_no ?? "",
            quePruebo: retro?.que_pruebo ?? "",
          }}
        />
      </section>
    </>
  );
}
