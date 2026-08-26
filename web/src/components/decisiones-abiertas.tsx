"use client";

// Decisiones abiertas del proyecto (adenda 04): qué opciones se barajan,
// quién la bloquea y cuántos días lleva abierta. El cierre registra la
// opción elegida y el motivo, como pide la regla R6; el formulario se
// abre en la propia fila, sin cambiar de pantalla. Desde el encargo 4b
// también se crean y se editan aquí: solo las abiertas, porque las
// cerradas son registro histórico.

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  cerrarDecisionAction,
  crearDecisionAction,
  editarDecisionAction,
  type EstadoDecision,
} from "@/app/(app)/proyectos/acciones";
import type { DecisionAbierta } from "@/lib/servicio-proyectos";

const CLASE_CAMPO =
  "w-full rounded-lg border border-linea bg-superficie px-3 py-2 text-[0.9375rem] leading-[1.6] text-tinta placeholder:text-tinta-tenue";

// Campos comunes del alta y la edición. Los valores por defecto vienen de
// la decisión (edición) o del eco del servidor tras un fallo (DUDA 32).
function CamposDecision({
  valores,
}: {
  valores: { titulo: string; opciones: string; bloqueado_por: string };
}) {
  return (
    <>
      <label className="flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Título
        </span>
        <input
          type="text"
          name="titulo"
          required
          defaultValue={valores.titulo}
          className={CLASE_CAMPO}
          placeholder="Qué hay que decidir, en una frase"
        />
      </label>
      <label className="mt-4 flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Opciones consideradas, una por línea
        </span>
        <textarea
          name="opciones"
          required
          rows={3}
          defaultValue={valores.opciones}
          className={CLASE_CAMPO}
          placeholder={"Al menos dos. Si solo hay una, no es una decisión."}
        />
      </label>
      <label className="mt-4 flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Quién la bloquea, si alguien
        </span>
        <input
          type="text"
          name="bloqueado_por"
          defaultValue={valores.bloqueado_por}
          className={CLASE_CAMPO}
          placeholder="Persona u organización a la que perseguir"
        />
      </label>
    </>
  );
}

function FormularioNueva({ slug, alCancelar }: { slug: string; alCancelar: () => void }) {
  const [estado, enviar, pendiente] = useActionState<EstadoDecision, FormData>(
    crearDecisionAction,
    null
  );
  const valores = estado?.valores ?? { titulo: "", opciones: "", bloqueado_por: "" };
  return (
    <form
      action={enviar}
      className="mt-4 rounded-lg border border-linea bg-superficie p-5"
      aria-label="Nueva decisión"
    >
      <input type="hidden" name="slug" value={slug} />
      <CamposDecision valores={valores} />
      {estado?.error ? <p className="mt-3 text-[0.8125rem] text-rojo">{estado.error}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" disabled={pendiente}>
          Registrar decisión
        </Button>
        <Button type="button" variant="ghost" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function FormularioEdicion({
  decision,
  slug,
  alCancelar,
}: {
  decision: DecisionAbierta;
  slug: string;
  alCancelar: () => void;
}) {
  const [estado, enviar, pendiente] = useActionState<EstadoDecision, FormData>(
    editarDecisionAction,
    null
  );
  const valores = estado?.valores ?? {
    titulo: decision.titulo,
    opciones: decision.opciones.join("\n"),
    bloqueado_por: decision.bloqueadoPor ?? "",
  };
  return (
    <form action={enviar} className="mt-4 border-t border-linea pt-4">
      <input type="hidden" name="decision_id" value={decision.id} />
      <input type="hidden" name="slug" value={slug} />
      <CamposDecision valores={valores} />
      {estado?.error ? <p className="mt-3 text-[0.8125rem] text-rojo">{estado.error}</p> : null}
      <div className="mt-4 flex gap-2">
        <Button type="submit" variant="secondary" disabled={pendiente}>
          Guardar cambios
        </Button>
        <Button type="button" variant="ghost" onClick={alCancelar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

function FormularioCierre({ decision, slug }: { decision: DecisionAbierta; slug: string }) {
  const [estado, enviar, pendiente] = useActionState(cerrarDecisionAction, null);
  return (
    <form action={enviar} className="mt-4 border-t border-linea pt-4">
      <input type="hidden" name="decision_id" value={decision.id} />
      <input type="hidden" name="slug" value={slug} />
      <fieldset>
        <legend className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Opción elegida
        </legend>
        <div className="mt-2 flex flex-col gap-2">
          {decision.opciones.map((opcion) => (
            <label key={opcion} className="flex items-start gap-2.5 text-[0.9375rem] text-tinta">
              <input
                type="radio"
                name="opcion"
                value={opcion}
                required
                className="mt-1.5 h-4 w-4 accent-coral"
              />
              <span className="leading-[1.6]">{opcion}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <label className="mt-4 flex flex-col gap-2">
        <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
          Motivo de la elección
        </span>
        <textarea
          name="motivo"
          required
          rows={3}
          className={CLASE_CAMPO}
          placeholder="Por qué esta opción y no las otras. Queda registrado con la decisión."
        />
      </label>
      {estado?.error ? <p className="mt-3 text-[0.8125rem] text-rojo">{estado.error}</p> : null}
      <div className="mt-4">
        <Button type="submit" disabled={pendiente}>
          Cerrar decisión
        </Button>
      </div>
    </form>
  );
}

export function DecisionesAbiertas({
  decisiones,
  slug,
  umbralDias,
}: {
  decisiones: DecisionAbierta[];
  slug: string;
  umbralDias: number | null;
}) {
  const [abierta, setAbierta] = useState<{ id: string; modo: "cerrar" | "editar" } | null>(null);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);

  return (
    <>
      {decisiones.length === 0 ? (
        <p className="mt-4 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-media">
          No hay decisiones abiertas en este proyecto. Cuando una tenga más de una opción viable,
          regístrala antes de ejecutarla: es la regla R6.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {decisiones.map((d) => {
            const pasada = umbralDias !== null && d.diasAbierta > umbralDias;
            const modo = abierta?.id === d.id ? abierta.modo : null;
            return (
              <li key={d.id} className="rounded-lg border border-linea bg-superficie p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h3 className="text-[0.9375rem] font-semibold text-tinta">{d.titulo}</h3>
                  <p className="t-dato text-[0.875rem] whitespace-nowrap">
                    <span className={pasada ? "text-ambar" : "text-tinta-media"}>
                      {d.diasAbierta} {d.diasAbierta === 1 ? "día" : "días"} abierta
                    </span>
                  </p>
                </div>
                {d.bloqueadoPor ? (
                  <p className="mt-1 text-[0.8125rem] text-tinta-media">
                    <span className="t-micro text-tinta-tenue">Bloquea</span> {d.bloqueadoPor}
                  </p>
                ) : null}
                <ul className="mt-3 flex flex-wrap gap-2">
                  {d.opciones.map((opcion) => (
                    <li
                      key={opcion}
                      className="rounded-full bg-papel-hondo px-3 py-1 text-[0.8125rem] leading-[1.5] text-tinta-media"
                    >
                      {opcion}
                    </li>
                  ))}
                </ul>
                {modo === "cerrar" ? <FormularioCierre decision={d} slug={slug} /> : null}
                {modo === "editar" ? (
                  <FormularioEdicion
                    decision={d}
                    slug={slug}
                    alCancelar={() => setAbierta(null)}
                  />
                ) : null}
                {modo === null ? (
                  <div className="mt-3 -ml-2 flex flex-wrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAbierta({ id: d.id, modo: "cerrar" })}
                    >
                      Cerrar decisión
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setAbierta({ id: d.id, modo: "editar" })}
                    >
                      Editar
                    </Button>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {nuevaAbierta ? (
        <FormularioNueva slug={slug} alCancelar={() => setNuevaAbierta(false)} />
      ) : (
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => setNuevaAbierta(true)}>
            Nueva decisión
          </Button>
        </div>
      )}
    </>
  );
}
