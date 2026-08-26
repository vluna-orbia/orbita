"use client";

// Paso 2 del ritual (H4.1): elegir los proyectos activos de la semana,
// hasta el límite de la regla R2 (parametros.limite, no un 3 en duro).
// El resto pasa a pausa automáticamente al guardar. Los continuos no
// consumen plaza (adenda 05). El servidor valida el límite otra vez.

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  guardarProyectosActivosAction,
  type EstadoRitual,
} from "@/app/(app)/rituales/acciones";

export type ProyectoParaPaso2 = {
  slug: string;
  nombre: string;
  cliente: string | null;
  colorAcento: string;
  estado: "activo" | "pausado";
  cuentaParaLimite: boolean;
};

export function PasoProyectos({
  proyectos,
  seleccionInicial,
  limite,
}: {
  proyectos: ProyectoParaPaso2[];
  seleccionInicial: string[];
  limite: number | null;
}) {
  const [seleccion, setSeleccion] = useState<string[]>(seleccionInicial);
  const [estado, enviar, pendiente] = useActionState<EstadoRitual, FormData>(
    guardarProyectosActivosAction,
    null
  );
  const queCuentan = proyectos.filter(
    (p) => seleccion.includes(p.slug) && p.cuentaParaLimite
  ).length;

  function alternar(slug: string) {
    setSeleccion((actual) =>
      actual.includes(slug) ? actual.filter((s) => s !== slug) : [...actual, slug]
    );
  }

  return (
    <form action={enviar}>
      <p className="mt-1 text-[0.8125rem] text-tinta-tenue">
        {limite !== null
          ? `Hasta ${limite} activos (regla R2). Llevas ${queCuentan}. El resto pasa a pausa al guardar.`
          : "La regla R2 está desactivada: sin tope de activos. El resto pasa a pausa al guardar."}
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {proyectos.map((p) => (
          <li key={p.slug}>
            <label
              className={`flex cursor-pointer items-center gap-4 rounded-lg border bg-superficie p-4 ${
                seleccion.includes(p.slug) ? "border-tinta" : "border-linea"
              }`}
            >
              <input
                type="checkbox"
                name="proyectos"
                value={p.slug}
                checked={seleccion.includes(p.slug)}
                onChange={() => alternar(p.slug)}
                className="h-5 w-5 accent-coral"
              />
              <span
                aria-hidden="true"
                className="h-8 w-[3px] rounded-full"
                style={{ backgroundColor: p.colorAcento }}
              />
              <span className="min-w-0">
                <span className="block text-[0.9375rem] font-medium text-tinta">{p.nombre}</span>
                <span className="block text-[0.8125rem] text-tinta-tenue">
                  {p.cliente ?? "Interno"}
                  {p.estado === "pausado" ? " · en pausa ahora" : ""}
                  {!p.cuentaParaLimite ? " · continuo, no consume plaza" : ""}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      {estado?.error ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <div className="mt-6">
        <Button type="submit" disabled={pendiente}>
          Guardar y pasar al resultado
        </Button>
      </div>
    </form>
  );
}
