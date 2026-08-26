"use client";

// Alta y edición de reglas del Playbook (H5.1). El alta crea una regla
// propia sin validación (un recordatorio); la edición toca texto,
// categoría y, en R1, R2 y R6, sus parámetros. Toda mutación crea una
// versión con motivo (H5.2); el motivo escrito aquí manda sobre el
// automático. El eco del servidor conserva lo escrito al fallar.

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  anadirReglaAction,
  editarReglaAction,
  type EstadoPlaybook,
} from "@/app/(app)/playbook/acciones";
import { CATEGORIAS_REGLA } from "@/lib/playbook";

const CLASE_CAMPO =
  "w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue";

function Campos({
  valores,
  conParametros,
}: {
  valores: { texto: string; categoria: string; parametros: string };
  conParametros: string | null;
}) {
  return (
    <>
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Texto de la regla
        </span>
        <textarea
          name="texto"
          required
          rows={2}
          defaultValue={valores.texto}
          className={CLASE_CAMPO}
          placeholder="Qué te comprometes a hacer, en una frase"
        />
      </label>
      <div className="mt-4 flex flex-wrap gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
            Categoría
          </span>
          <select name="categoria" defaultValue={valores.categoria} className={`${CLASE_CAMPO} h-11 w-auto`}>
            {CATEGORIAS_REGLA.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        {conParametros ? (
          <label className="flex flex-col gap-2">
            <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
              {conParametros}
            </span>
            <input
              type="number"
              name="parametros"
              min={1}
              required
              defaultValue={valores.parametros}
              className={`${CLASE_CAMPO} w-28 font-mono tabular-nums`}
            />
          </label>
        ) : (
          <input type="hidden" name="parametros" value="" />
        )}
      </div>
      <label className="mt-4 flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Motivo del cambio, para el historial
        </span>
        <input
          type="text"
          name="motivo"
          defaultValue=""
          className={CLASE_CAMPO}
          placeholder="Opcional. Si lo dejas vacío, el historial anota el cambio."
        />
      </label>
    </>
  );
}

export function FormularioNuevaRegla() {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState<EstadoPlaybook, FormData>(
    anadirReglaAction,
    null
  );
  if (!abierto) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setAbierto(true)}>
        Añadir regla propia
      </Button>
    );
  }
  return (
    <form action={enviar} className="mt-4 rounded-lg border border-linea bg-superficie p-6">
      <p className="text-[0.9375rem] leading-[1.6] text-tinta-media">
        Una regla propia no lleva validación: es un recordatorio que aparece en el ritual de su
        categoría.
      </p>
      <div className="mt-4">
        <Campos valores={{ texto: "", categoria: "foco", parametros: "" }} conParametros={null} />
      </div>
      {estado?.error ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm" disabled={pendiente}>
          Añadir al Playbook
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

export function FormularioEditarRegla({
  clave,
  texto,
  categoria,
  parametros,
}: {
  clave: string;
  texto: string;
  categoria: string;
  parametros: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [estado, enviar, pendiente] = useActionState<EstadoPlaybook, FormData>(
    editarReglaAction,
    null
  );
  const etiquetaParametro =
    clave === "R6" ? "Umbral en días" : clave === "R1" || clave === "R2" ? "Límite" : null;
  if (!abierto) {
    return (
      <Button variant="secondary" size="sm" onClick={() => setAbierto(true)}>
        Editar regla
      </Button>
    );
  }
  return (
    <form action={enviar} className="mt-4 rounded-lg border border-linea bg-superficie p-6">
      <input type="hidden" name="clave" value={clave} />
      <Campos valores={{ texto, categoria, parametros }} conParametros={etiquetaParametro} />
      {estado?.error ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" size="sm" disabled={pendiente}>
          Guardar cambio
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setAbierto(false)}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
