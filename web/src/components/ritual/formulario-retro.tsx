"use client";

// Los tres campos libres de la retrospectiva (H4.2). Cuando qué cambio
// pruebo lleva texto, aparece el botón para convertirlo en regla del
// Playbook: guarda la retro y crea la regla en un solo envío. Nunca se
// aplica sola.

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { guardarRetroAction, type EstadoRitual } from "@/app/(app)/rituales/acciones";

const CLASE_CAMPO =
  "w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue";

export function FormularioRetro({
  valores,
}: {
  valores: { queFunciono: string; queNo: string; quePruebo: string };
}) {
  const [estado, enviar, pendiente] = useActionState<EstadoRitual, FormData>(
    guardarRetroAction,
    null
  );
  const [quePruebo, setQuePruebo] = useState(valores.quePruebo);

  return (
    <form action={enviar} className="mt-4 rounded-lg border border-linea bg-superficie p-6">
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Qué funcionó
        </span>
        <textarea
          name="que_funciono"
          rows={2}
          defaultValue={valores.queFunciono}
          className={CLASE_CAMPO}
          placeholder="Lo que merece repetirse la semana que viene"
        />
      </label>
      <label className="mt-4 flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Qué no funcionó
        </span>
        <textarea
          name="que_no"
          rows={2}
          defaultValue={valores.queNo}
          className={CLASE_CAMPO}
          placeholder="Dónde se fue el tiempo o el foco"
        />
      </label>
      <label className="mt-4 flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Qué cambio pruebo
        </span>
        <textarea
          name="que_pruebo"
          rows={2}
          value={quePruebo}
          onChange={(e) => setQuePruebo(e.target.value)}
          className={CLASE_CAMPO}
          placeholder="Un cambio concreto para la semana siguiente"
        />
      </label>
      {estado?.error ? (
        <p role="alert" className="mt-3 text-[0.8125rem] text-rojo">
          {estado.error}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button type="submit" disabled={pendiente}>
          Guardar retrospectiva
        </Button>
        {quePruebo.trim() !== "" ? (
          <Button
            type="submit"
            name="convertir"
            value="si"
            variant="secondary"
            disabled={pendiente}
          >
            Guardar y convertir en regla del Playbook
          </Button>
        ) : null}
      </div>
    </form>
  );
}
