// Ficha de una regla del Playbook (H5.1, H5.3): el texto completo, su
// estado y parámetros, la edición con motivo para el historial y las
// barras de adherencia de las últimas ocho semanas, calculadas con las
// definiciones exactas de H5.3 y materializadas por el job perezoso.

import Link from "next/link";
import { notFound } from "next/navigation";
import { AvisoBanner } from "@/components/aviso-banner";
import { BarrasAdherencia } from "@/components/barras-adherencia";
import { FormularioEditarRegla } from "@/components/formulario-regla";
import { InterruptorRegla } from "@/components/interruptor-regla";
import { retirarReglaAction } from "@/app/(app)/playbook/acciones";
import { prisma } from "@/lib/prisma";
import { CLAVES_CON_METRICA, type ClaveConMetrica } from "@/lib/adherencia";
import { esReglaBase } from "@/lib/playbook";
import { metricasDeRegla } from "@/lib/servicio-adherencia";
import { versionVigente } from "@/lib/servicio-playbook";
import { fechaCorta } from "@/lib/formato";

export const dynamic = "force-dynamic";

// La definición exacta de cada métrica, de H5.3.
const DEFINICIONES: Record<ClaveConMetrica, string> = {
  R1: "Intentos de superar el WIP sobre el total de transiciones a en curso. Aquí menos es mejor: la barra se pinta invertida y 100 significa ninguna semana forzando el límite.",
  R2: "Semanas con proyectos activos dentro del límite de la regla. La cuenta sale de la planificación de cada semana; una semana sin plan queda sin dato.",
  R3: "Sesiones cerradas con nota sobre el total de sesiones. Las abandonadas cuentan en el total y no puntúan, aunque la nota llegue después.",
  R4: "Elementos del inbox procesados en el ritual sobre el total capturado en la semana. El triaje del lunes puede procesar capturas de la semana anterior.",
  R5: "Resultados comprometidos cumplidos sobre los comprometidos. Hasta que la retrospectiva los verifica, la semana queda sin dato.",
  R6: "Decisiones cerradas con motivo registrado sobre las cerradas en la semana.",
};

export default async function FichaDeRegla({
  params,
  searchParams,
}: {
  params: Promise<{ clave: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { clave } = await params;
  const { aviso } = await searchParams;
  const vigente = await versionVigente(prisma);
  const regla = vigente.reglas.find((r) => r.clave === clave);
  if (!regla || regla.retiradaEl) notFound();

  const conMetrica = (CLAVES_CON_METRICA as readonly string[]).includes(clave);
  const serie = conMetrica
    ? await metricasDeRegla(prisma, clave as ClaveConMetrica, 8)
    : null;

  const parametros = regla.parametros
    ? "limite" in regla.parametros
      ? String(regla.parametros.limite)
      : String(regla.parametros.dias_umbral)
    : "";

  return (
    <>
      <p className="t-micro text-tinta-tenue">
        <Link href="/playbook" className="hover:underline">
          Playbook
        </Link>{" "}
        / {regla.clave}
      </p>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <h1 className="max-w-[68ch] font-serif text-[2rem] leading-[1.15]">{regla.texto}</h1>
        <InterruptorRegla clave={regla.clave} activa={regla.activa} volverA="ficha" />
      </div>
      <p className="mt-3 text-[0.8125rem] text-tinta-tenue">
        <span className="t-micro rounded-full bg-papel-hondo px-2 py-1 text-tinta-media">
          {regla.categoria}
        </span>
        <span className="ml-3">{`En el playbook desde el ${fechaCorta(regla.fechaDeAlta)}`}</span>
        {regla.parametros ? (
          <span className="ml-3 font-mono tabular-nums">
            {"limite" in regla.parametros
              ? `límite ${regla.parametros.limite}`
              : `umbral ${regla.parametros.dias_umbral} días`}
          </span>
        ) : null}
        {!regla.activa ? <span className="ml-3">Desactivada: su validación no corre.</span> : null}
      </p>

      {aviso === "editada" ? (
        <div className="mt-6">
          <AvisoBanner tono="neutro">Regla editada. El cambio queda en el historial.</AvisoBanner>
        </div>
      ) : null}

      {conMetrica && serie ? (
        <section className="mt-10" aria-label="Adherencia de las últimas ocho semanas">
          <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Adherencia</h2>
          <p className="mt-1 max-w-[68ch] text-[0.8125rem] leading-[1.5] text-tinta-tenue">
            {DEFINICIONES[clave as ClaveConMetrica]}
          </p>
          <div className="mt-6 rounded-lg border border-linea bg-superficie p-6">
            <BarrasAdherencia clave={clave as ClaveConMetrica} serie={serie} />
          </div>
          <p className="mt-2 text-[0.6875rem] text-tinta-tenue">
            Se calcula cada semana, de lunes a domingo en Europe/Madrid. La última barra es la
            semana en curso y todavía se mueve.
          </p>
        </section>
      ) : (
        <section className="mt-10" aria-label="Sin métrica">
          <p className="max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-media">
            Las reglas propias no llevan métrica de adherencia: son recordatorios que aparecen en
            el ritual de su categoría.
          </p>
        </section>
      )}

      <section className="mt-10" aria-label="Editar la regla">
        <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Editar</h2>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <FormularioEditarRegla
            clave={regla.clave}
            texto={regla.texto}
            categoria={regla.categoria}
            parametros={parametros}
          />
          {!esReglaBase(regla.clave) ? (
            <form action={retirarReglaAction}>
              <input type="hidden" name="clave" value={regla.clave} />
              <button
                type="submit"
                className="text-[0.8125rem] font-medium text-tinta-media underline-offset-4 hover:underline"
              >
                Retirar del playbook
              </button>
            </form>
          ) : null}
        </div>
      </section>
    </>
  );
}
