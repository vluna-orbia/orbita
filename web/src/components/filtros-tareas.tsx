"use client";

// Filtros de la vista de tareas (H2.6): proyecto, estado y vencimiento,
// persistidos en la URL para que la vista se pueda guardar y compartir
// consigo mismo. La agrupación, por proyecto o por estado, también viaja
// en la URL.

import { useRouter, useSearchParams } from "next/navigation";
import { ESTADOS_TAREA, NOMBRE_ESTADO } from "@/lib/tareas";

export type ProyectoParaFiltro = { nombre: string; slug: string };

function Selector({
  etiqueta,
  nombre,
  valor,
  opciones,
  alCambiar,
}: {
  etiqueta: string;
  nombre: string;
  valor: string;
  opciones: { valor: string; texto: string }[];
  alCambiar: (nombre: string, valor: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="t-micro text-tinta-tenue">{etiqueta}</span>
      <select
        value={valor}
        onChange={(e) => alCambiar(nombre, e.target.value)}
        className="rounded-[6px] border border-linea bg-superficie px-2 py-1.5 text-[0.8125rem] text-tinta"
      >
        {opciones.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.texto}
          </option>
        ))}
      </select>
    </label>
  );
}

export function FiltrosTareas({ proyectos }: { proyectos: ProyectoParaFiltro[] }) {
  const router = useRouter();
  const parametros = useSearchParams();

  const alCambiar = (nombre: string, valor: string) => {
    const siguientes = new URLSearchParams(parametros.toString());
    if (valor === "") siguientes.delete(nombre);
    else siguientes.set(nombre, valor);
    const cadena = siguientes.toString();
    router.replace(cadena ? `/tareas?${cadena}` : "/tareas");
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
      <Selector
        etiqueta="Proyecto"
        nombre="proyecto"
        valor={parametros.get("proyecto") ?? ""}
        alCambiar={alCambiar}
        opciones={[
          { valor: "", texto: "Todos" },
          ...proyectos.map((p) => ({ valor: p.slug, texto: p.nombre })),
          { valor: "sin-proyecto", texto: "Sin proyecto" },
        ]}
      />
      <Selector
        etiqueta="Estado"
        nombre="estado"
        valor={parametros.get("estado") ?? ""}
        alCambiar={alCambiar}
        opciones={[
          { valor: "", texto: "Abiertas" },
          ...ESTADOS_TAREA.map((e) => ({ valor: e, texto: NOMBRE_ESTADO[e] })),
        ]}
      />
      <Selector
        etiqueta="Vencimiento"
        nombre="vencimiento"
        valor={parametros.get("vencimiento") ?? "todas"}
        alCambiar={alCambiar}
        opciones={[
          { valor: "todas", texto: "Todas" },
          { valor: "vencidas", texto: "Vencidas" },
          { valor: "proximos-7", texto: "Próximos 7 días" },
        ]}
      />
      <Selector
        etiqueta="Agrupar por"
        nombre="agrupar"
        valor={parametros.get("agrupar") ?? "estado"}
        alCambiar={alCambiar}
        opciones={[
          { valor: "estado", texto: "Estado" },
          { valor: "proyecto", texto: "Proyecto" },
        ]}
      />
    </div>
  );
}
