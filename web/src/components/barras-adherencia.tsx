// Barras de adherencia (H5.3): las últimas ocho semanas en la ficha de
// cada regla y la barra fina de cuatro en la tarjeta (documento 01). Sin
// librerías de gráficos: columnas con la altura del porcentaje, en
// coral-suave sobre papel-hondo, y hueco discontinuo cuando la semana no
// tiene dato. En R1 la barra se pinta invertida (100 = ningún intento);
// la fracción cruda se enseña debajo tal cual la define la historia.

import {
  porcentaje,
  porcentajeParaBarra,
  type ClaveConMetrica,
  type Medida,
} from "@/lib/adherencia";

export type PuntoParaBarras = { semanaInicio: Date; medida: Medida | null };

function etiquetaDeSemana(lunes: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  })
    .format(lunes)
    .replace(".", "");
}

// La tira fina de la tarjeta de regla: cuatro columnas de 4px de alto
// variable, sin etiquetas.
export function BarrasFinas({
  clave,
  serie,
}: {
  clave: ClaveConMetrica;
  serie: PuntoParaBarras[];
}) {
  return (
    <div className="flex h-8 items-end gap-1" aria-hidden="true">
      {serie.map((punto) => {
        const alto = punto.medida ? Math.max(8, porcentajeParaBarra(clave, punto.medida)) : 0;
        return punto.medida ? (
          <div
            key={punto.semanaInicio.toISOString()}
            className="w-2 rounded-[2px] bg-coral-suave"
            style={{ height: `${alto}%` }}
          />
        ) : (
          <div
            key={punto.semanaInicio.toISOString()}
            className="h-2 w-2 rounded-[2px] border border-dashed border-linea"
          />
        );
      })}
    </div>
  );
}

// Las barras grandes de la ficha: ocho semanas con etiqueta del lunes,
// porcentaje encima y la fracción cruda de la métrica debajo.
export function BarrasAdherencia({
  clave,
  serie,
}: {
  clave: ClaveConMetrica;
  serie: PuntoParaBarras[];
}) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {serie.map((punto, i) => {
        const esActual = i === serie.length - 1;
        const alto = punto.medida ? Math.max(4, porcentajeParaBarra(clave, punto.medida)) : 0;
        return (
          <div key={punto.semanaInicio.toISOString()} className="flex flex-col items-center gap-2">
            <span className="font-mono text-[0.875rem] tabular-nums text-tinta-media">
              {punto.medida ? `${porcentajeParaBarra(clave, punto.medida)}` : "—"}
            </span>
            <div className="flex h-24 w-full max-w-[40px] items-end rounded-[4px] bg-papel-hondo">
              {punto.medida ? (
                <div
                  className={`w-full rounded-[4px] ${esActual ? "bg-coral" : "bg-coral-suave"}`}
                  style={{ height: `${alto}%` }}
                />
              ) : (
                <div className="h-full w-full rounded-[4px] border border-dashed border-linea" />
              )}
            </div>
            <span className="t-micro text-tinta-tenue">{etiquetaDeSemana(punto.semanaInicio)}</span>
            <span className="font-mono text-[0.6875rem] tabular-nums text-tinta-tenue">
              {punto.medida ? `${punto.medida.numerador}/${punto.medida.denominador}` : "sin dato"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
