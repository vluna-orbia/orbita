// Playbook (H5.1): las reglas del método, con su categoría, su fecha de
// alta, sus parámetros y el interruptor que desactiva la validación de
// verdad. Cada tarjeta lleva la barra fina de adherencia de las últimas
// cuatro semanas (documento 01) y enlaza a la ficha con las ocho. Las
// retiradas aparecen tachadas en un histórico plegable.

import Link from "next/link";
import { AvisoBanner } from "@/components/aviso-banner";
import { BarrasFinas } from "@/components/barras-adherencia";
import { FormularioNuevaRegla } from "@/components/formulario-regla";
import { InterruptorRegla } from "@/components/interruptor-regla";
import { retirarReglaAction } from "@/app/(app)/playbook/acciones";
import { prisma } from "@/lib/prisma";
import { CLAVES_CON_METRICA, type ClaveConMetrica } from "@/lib/adherencia";
import { esReglaBase } from "@/lib/playbook";
import { metricasDeRegla, type PuntoDeAdherencia } from "@/lib/servicio-adherencia";
import { versionVigente, type ReglaVigente } from "@/lib/servicio-playbook";
import { fechaCorta } from "@/lib/formato";

export const dynamic = "force-dynamic";

const AVISOS: Record<string, string> = {
  anadida: "Regla añadida al Playbook.",
  retirada: "Regla retirada. Queda tachada en el histórico.",
};

function resumenDeParametros(regla: ReglaVigente): string | null {
  if (!regla.parametros) return null;
  if ("limite" in regla.parametros) return `límite ${regla.parametros.limite}`;
  if ("dias_umbral" in regla.parametros) return `umbral ${regla.parametros.dias_umbral} días`;
  return null;
}

function TarjetaRegla({
  regla,
  serie,
}: {
  regla: ReglaVigente;
  serie: PuntoDeAdherencia[] | null;
}) {
  return (
    <li className="rounded-lg border border-linea bg-superficie p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[0.875rem] tabular-nums text-tinta">{regla.clave}</span>
            <span className="t-micro rounded-full bg-papel-hondo px-2 py-1 text-tinta-media">
              {regla.categoria}
            </span>
            {resumenDeParametros(regla) ? (
              <span className="font-mono text-[0.6875rem] tabular-nums text-tinta-tenue">
                {resumenDeParametros(regla)}
              </span>
            ) : null}
            {!regla.activa ? (
              <span className="t-micro rounded-full bg-papel-hondo px-2 py-1 text-tinta-tenue">
                desactivada
              </span>
            ) : null}
          </div>
          <p className="mt-3 text-[0.9375rem] leading-[1.6] text-tinta">
            <Link href={`/playbook/${regla.clave}`} className="hover:underline">
              {regla.texto}
            </Link>
          </p>
          <p className="mt-2 text-[0.8125rem] text-tinta-tenue">
            En el playbook desde el {fechaCorta(regla.fechaDeAlta)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-3">
          <InterruptorRegla clave={regla.clave} activa={regla.activa} />
          {serie ? <BarrasFinas clave={regla.clave as ClaveConMetrica} serie={serie} /> : null}
        </div>
      </div>
    </li>
  );
}

export default async function Playbook({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const vigente = await versionVigente(prisma);
  const series = new Map<string, PuntoDeAdherencia[]>();
  for (const clave of CLAVES_CON_METRICA) {
    series.set(clave, await metricasDeRegla(prisma, clave, 4));
  }

  const activasBase = vigente.reglas.filter((r) => esReglaBase(r.clave) && !r.retiradaEl);
  const propias = vigente.reglas.filter((r) => !esReglaBase(r.clave) && !r.retiradaEl);
  const retiradas = vigente.reglas.filter((r) => r.retiradaEl);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-[2rem] leading-[1.15]">Playbook</h1>
          <p className="mt-2 font-mono text-[0.875rem] tabular-nums text-tinta-tenue">
            {`Versión ${vigente.version}`} · {fechaCorta(vigente.fecha)}
          </p>
        </div>
        <Link
          href="/playbook/versiones"
          className="text-[0.8125rem] font-medium text-tinta-media underline-offset-4 hover:underline"
        >
          Historial de versiones
        </Link>
      </div>

      {aviso && AVISOS[aviso] ? (
        <div className="mt-6">
          <AvisoBanner tono="neutro">{AVISOS[aviso]}</AvisoBanner>
        </div>
      ) : null}

      <p className="mt-4 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-media">
        Desactivar una regla desactiva su validación en la aplicación, no solo el aviso. La barra
        fina resume la adherencia de las últimas cuatro semanas; la ficha de cada regla enseña las
        ocho.
      </p>

      <ul className="mt-8 flex flex-col gap-3" aria-label="Reglas base">
        {activasBase.map((regla) => (
          <TarjetaRegla key={regla.clave} regla={regla} serie={series.get(regla.clave) ?? null} />
        ))}
      </ul>

      <section className="mt-10" aria-label="Reglas propias">
        <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Reglas propias</h2>
        <p className="mt-1 text-[0.8125rem] text-tinta-tenue">
          Sin validación asociada: se muestran como recordatorio en el ritual de su categoría.
        </p>
        {propias.length > 0 ? (
          <ul className="mt-4 flex flex-col gap-3">
            {propias.map((regla) => (
              <li key={regla.clave} className="rounded-lg border border-linea bg-superficie p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[0.875rem] tabular-nums text-tinta">
                        {regla.clave}
                      </span>
                      <span className="t-micro rounded-full bg-papel-hondo px-2 py-1 text-tinta-media">
                        {regla.categoria}
                      </span>
                      {!regla.activa ? (
                        <span className="t-micro rounded-full bg-papel-hondo px-2 py-1 text-tinta-tenue">
                          desactivada
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 text-[0.9375rem] leading-[1.6] text-tinta">
                      <Link href={`/playbook/${regla.clave}`} className="hover:underline">
                        {regla.texto}
                      </Link>
                    </p>
                    <p className="mt-2 text-[0.8125rem] text-tinta-tenue">
                      En el playbook desde el {fechaCorta(regla.fechaDeAlta)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <InterruptorRegla clave={regla.clave} activa={regla.activa} />
                    <form action={retirarReglaAction}>
                      <input type="hidden" name="clave" value={regla.clave} />
                      <button
                        type="submit"
                        className="text-[0.8125rem] font-medium text-tinta-media underline-offset-4 hover:underline"
                      >
                        Retirar
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-media">
            Todavía no hay reglas propias. La retrospectiva propone crearlas desde qué cambio
            pruebo.
          </p>
        )}
        <div className="mt-4">
          <FormularioNuevaRegla />
        </div>
      </section>

      {retiradas.length > 0 ? (
        <details className="mt-10">
          <summary className="cursor-pointer text-[0.8125rem] font-medium text-tinta-media">
            {`Reglas retiradas (${retiradas.length})`}
          </summary>
          <ul className="mt-4 flex flex-col gap-2">
            {retiradas.map((regla) => (
              <li
                key={regla.clave}
                className="rounded-lg border border-linea bg-papel-hondo px-4 py-3"
              >
                <span className="font-mono text-[0.875rem] text-tinta-tenue">{regla.clave}</span>
                <span className="ml-3 text-[0.9375rem] text-tinta-tenue line-through">
                  {regla.texto}
                </span>
                {regla.retiradaEl ? (
                  <span className="ml-3 text-[0.8125rem] text-tinta-tenue">
                    {`retirada el ${fechaCorta(regla.retiradaEl)}`}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </>
  );
}
