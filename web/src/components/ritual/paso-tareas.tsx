"use client";

// Paso 4 del ritual (H4.1): seleccionar del backlog de cada proyecto
// activo las tareas que sostienen el resultado. Lo marcado queda en
// semana; lo desmarcado vuelve al backlog. Las tareas en curso no se
// tocan desde aquí.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { guardarTareasAction, type EstadoRitual } from "@/app/(app)/rituales/acciones";

export type ProyectoParaPaso4 = {
  slug: string;
  nombre: string;
  colorAcento: string;
  tareas: {
    id: string;
    titulo: string;
    estado: "backlog" | "semana";
    bloqueada: boolean;
    siguientePaso: string | null;
  }[];
};

export function PasoTareas({ proyectos }: { proyectos: ProyectoParaPaso4[] }) {
  const [estado, enviar, pendiente] = useActionState<EstadoRitual, FormData>(
    guardarTareasAction,
    null
  );
  return (
    <form action={enviar}>
      <p className="mt-1 max-w-[68ch] text-[0.8125rem] text-tinta-tenue">
        Marca las tareas que sostienen el resultado de cada proyecto. Lo desmarcado vuelve al
        backlog.
      </p>
      <div className="mt-4 flex flex-col gap-6">
        {proyectos.map((p) => (
          <section key={p.slug} aria-label={`Tareas de ${p.nombre}`}>
            <h3 className="flex items-center gap-3 text-[0.9375rem] font-semibold text-tinta">
              <span
                aria-hidden="true"
                className="h-5 w-[3px] rounded-full"
                style={{ backgroundColor: p.colorAcento }}
              />
              {p.nombre}
            </h3>
            {p.tareas.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1">
                {p.tareas.map((t) => (
                  <li key={t.id}>
                    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-linea bg-superficie px-4 py-3">
                      <input
                        type="checkbox"
                        name="tareas"
                        value={t.id}
                        defaultChecked={t.estado === "semana"}
                        className="mt-1 h-4 w-4 accent-coral"
                      />
                      <span className="min-w-0">
                        <span className="block text-[0.9375rem] leading-[1.6] text-tinta">
                          {t.titulo}
                          {t.bloqueada ? (
                            <span className="ml-2 text-[0.8125rem] text-ambar">bloqueada</span>
                          ) : null}
                        </span>
                        {t.siguientePaso ? (
                          <span className="block text-[0.8125rem] text-tinta-tenue">
                            {t.siguientePaso}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-[0.8125rem] text-tinta-tenue">
                Sin tareas en backlog ni en semana. Se pueden capturar después con la tecla c.
              </p>
            )}
          </section>
        ))}
      </div>
      {estado?.error ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <div className="mt-6">
        <Button type="submit" disabled={pendiente}>
          Montar la semana
        </Button>
      </div>
    </form>
  );
}
