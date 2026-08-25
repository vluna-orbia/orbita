"use client";

// Fila de tarea (documento 01, componentes clave): casilla, título, chip
// del proyecto con su color, siguiente paso en tinta tenue, estimación en
// mono a la derecha. Las tareas en curso llevan la barra izquierda coral
// de 3px. Las transiciones se validan en el servidor: el rechazo por WIP
// trae las tareas en curso y se ofrecen aquí mismo (H2.3), y volver de
// en_curso a semana pide el siguiente paso antes de confirmar (H2.4).

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { cambiarEstadoTareaAction, type EstadoTransicion } from "@/app/(app)/tareas/acciones";
import { Button } from "@/components/ui/button";
import { fechaCorta } from "@/lib/formato";
import type { EstadoTarea } from "@/lib/tareas";
import type { TareaDeLista, TareaEnCurso } from "@/lib/servicio-tareas";
import { cn } from "@/lib/utils";

// Acciones visibles por estado, con el texto exacto de lo que hacen.
const ACCIONES: Record<EstadoTarea, { destino: EstadoTarea; etiqueta: string }[]> = {
  inbox: [
    { destino: "backlog", etiqueta: "Al backlog" },
    { destino: "semana", etiqueta: "A la semana" },
    { destino: "descartada", etiqueta: "Descartar" },
  ],
  backlog: [
    { destino: "semana", etiqueta: "A la semana" },
    { destino: "descartada", etiqueta: "Descartar" },
  ],
  semana: [
    { destino: "en_curso", etiqueta: "Empezar" },
    { destino: "backlog", etiqueta: "Al backlog" },
    { destino: "descartada", etiqueta: "Descartar" },
  ],
  en_curso: [
    { destino: "semana", etiqueta: "Devolver a la semana" },
    { destino: "descartada", etiqueta: "Descartar" },
  ],
  hecha: [],
  descartada: [],
};

// Mini formulario de una transición. Si el servidor pide siguiente paso
// (en_curso → semana sin él), despliega el campo en la propia fila.
function BotonTransicion({
  tareaId,
  destino,
  etiqueta,
  alResponder,
}: {
  tareaId: string;
  destino: EstadoTarea;
  etiqueta: string;
  alResponder: (r: EstadoTransicion) => void;
}) {
  const [estado, enviar, pendiente] = useActionState(cambiarEstadoTareaAction, null);
  useEffect(() => {
    if (estado) alResponder(estado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
  return (
    <form action={enviar} className="inline">
      <input type="hidden" name="tarea_id" value={tareaId} />
      <input type="hidden" name="destino" value={destino} />
      <Button type="submit" variant="ghost" size="sm" disabled={pendiente}>
        {etiqueta}
      </Button>
    </form>
  );
}

// Aviso de límite de WIP (H2.3): las tareas en curso con botones para
// cerrarlas o devolverlas a semana desde el propio aviso.
export function AvisoWip({
  mensaje,
  tareas,
  alResolver,
}: {
  mensaje: string;
  tareas: TareaEnCurso[];
  alResolver: () => void;
}) {
  return (
    <div role="alert" className="mt-3 rounded-lg bg-coral-velo px-4 py-3">
      <p className="text-[0.9375rem] leading-[1.6] text-tinta">{mensaje}</p>
      <ul className="mt-2 flex flex-col gap-2">
        {tareas.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg bg-superficie px-3 py-2"
          >
            <div className="min-w-0">
              <p className="truncate text-[0.9375rem] text-tinta">{t.titulo}</p>
              {t.proyectoNombre ? (
                <p className="text-[0.6875rem] font-medium tracking-[0.08em] uppercase text-tinta-tenue">
                  {t.proyectoNombre}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 gap-1">
              <FilaDeAviso tareaId={t.id} alResolver={alResolver} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Acciones de una tarea dentro del aviso de WIP: cerrar o devolver a
// semana. Devolver sin siguiente paso lo pide aquí mismo.
function FilaDeAviso({
  tareaId,
  alResolver,
}: {
  tareaId: string;
  alResolver: () => void;
}) {
  const [estado, enviar, pendiente] = useActionState(cambiarEstadoTareaAction, null);
  const [pidePaso, setPidePaso] = useState(false);
  useEffect(() => {
    if (estado?.ok) alResolver();
    if (estado && !estado.ok && estado.pideSiguientePaso) setPidePaso(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);

  if (pidePaso) {
    return (
      <form action={enviar} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="tarea_id" value={tareaId} />
        <input type="hidden" name="destino" value="semana" />
        <input
          type="text"
          name="siguiente_paso"
          autoFocus
          placeholder="Siguiente paso antes de devolverla"
          className="w-56 rounded-lg border border-linea bg-superficie px-2 py-1 text-[0.8125rem] text-tinta placeholder:text-tinta-tenue"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={pendiente}>
          Devolver
        </Button>
      </form>
    );
  }
  return (
    <>
      <form action={enviar} className="inline">
        <input type="hidden" name="tarea_id" value={tareaId} />
        <input type="hidden" name="destino" value="hecha" />
        <Button type="submit" variant="secondary" size="sm" disabled={pendiente}>
          Cerrar
        </Button>
      </form>
      <form action={enviar} className="inline">
        <input type="hidden" name="tarea_id" value={tareaId} />
        <input type="hidden" name="destino" value="semana" />
        <Button type="submit" variant="ghost" size="sm" disabled={pendiente}>
          A semana
        </Button>
      </form>
    </>
  );
}

export function FilaTarea({ tarea }: { tarea: TareaDeLista }) {
  const [respuesta, setRespuesta] = useState<EstadoTransicion>(null);
  const [pidePaso, setPidePaso] = useState(false);
  const [hechaEstado, marcarHecha, marcandoHecha] = useActionState(cambiarEstadoTareaAction, null);

  const alResponder = (r: EstadoTransicion) => {
    if (r && !r.ok && r.pideSiguientePaso) {
      setPidePaso(true);
      setRespuesta(null);
    } else {
      setRespuesta(r);
      if (r?.ok) setPidePaso(false);
    }
  };

  const enCurso = tarea.estado === "en_curso";
  const terminada = tarea.estado === "hecha" || tarea.estado === "descartada";
  const puedeMarcarse = tarea.estado === "semana" || tarea.estado === "en_curso";
  const vencida = tarea.venceEl !== null && new Date(tarea.venceEl).getTime() < Date.now();

  return (
    <li
      className={cn(
        "relative overflow-hidden rounded-lg border border-linea bg-superficie px-4 py-3",
        terminada && "opacity-60"
      )}
    >
      {enCurso ? (
        <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-coral" />
      ) : null}
      <div className="flex items-start gap-3">
        {puedeMarcarse ? (
          <form action={marcarHecha} className="mt-1 shrink-0">
            <input type="hidden" name="tarea_id" value={tarea.id} />
            <input type="hidden" name="destino" value="hecha" />
            <button
              type="submit"
              disabled={marcandoHecha}
              aria-label={`Marcar hecha: ${tarea.titulo}`}
              className="block h-[18px] w-[18px] rounded-[5px] border-[1.5px] border-tinta-tenue transition-colors duration-150 hover:border-coral"
            />
          </form>
        ) : (
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 block h-[18px] w-[18px] shrink-0 rounded-[5px] border-[1.5px]",
              tarea.estado === "hecha" ? "border-verde bg-verde" : "border-linea bg-papel-hondo"
            )}
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <Link
              href={`/tareas/${tarea.id}`}
              className={cn(
                "text-[0.9375rem] font-medium leading-[1.5] text-tinta hover:underline hover:underline-offset-4",
                tarea.estado === "hecha" && "line-through decoration-tinta-tenue",
                tarea.estado === "descartada" && "line-through decoration-tinta-tenue"
              )}
            >
              {tarea.titulo}
            </Link>
            {tarea.proyectoNombre ? (
              <span
                className="rounded-full px-2 py-0.5 text-[0.6875rem] font-medium tracking-[0.08em] uppercase"
                style={{ backgroundColor: "var(--color-papel-hondo)", color: tarea.colorAcento ?? undefined }}
              >
                {tarea.proyectoNombre}
              </span>
            ) : null}
            {tarea.motivoBloqueo ? (
              <span className="text-[0.8125rem] text-ambar">Bloqueada: {tarea.motivoBloqueo}</span>
            ) : null}
            {tarea.venceEl ? (
              <span className={cn("t-dato text-[0.8125rem]", vencida ? "text-rojo" : "text-tinta-tenue")}>
                vence {fechaCorta(new Date(tarea.venceEl))}
              </span>
            ) : null}
          </div>
          {tarea.siguientePaso ? (
            <p className="mt-1 text-[0.8125rem] leading-[1.5] text-tinta-tenue">
              Siguiente paso: {tarea.siguientePaso}
            </p>
          ) : null}
          {!terminada ? (
            <div className="mt-1.5 -ml-2 flex flex-wrap items-center">
              {ACCIONES[tarea.estado].map((a) => (
                <BotonTransicion
                  key={a.destino}
                  tareaId={tarea.id}
                  destino={a.destino}
                  etiqueta={a.etiqueta}
                  alResponder={alResponder}
                />
              ))}
            </div>
          ) : null}
          {pidePaso ? (
            <FormularioPasoInline tareaId={tarea.id} alResponder={alResponder} />
          ) : null}
          {respuesta && !respuesta.ok && respuesta.limiteWip ? (
            <AvisoWip
              mensaje={respuesta.error}
              tareas={respuesta.limiteWip}
              alResolver={() => setRespuesta(null)}
            />
          ) : null}
          {respuesta && !respuesta.ok && !respuesta.limiteWip && !respuesta.pideSiguientePaso ? (
            <p className="mt-2 text-[0.8125rem] text-rojo">{respuesta.error}</p>
          ) : null}
          {hechaEstado && !hechaEstado.ok ? (
            <p className="mt-2 text-[0.8125rem] text-rojo">{hechaEstado.error}</p>
          ) : null}
        </div>
        {tarea.estimacionMin !== null ? (
          <span className="t-dato mt-1 shrink-0 text-[0.875rem] text-tinta-tenue">
            {tarea.estimacionMin} min
          </span>
        ) : null}
      </div>
    </li>
  );
}

// Campo de siguiente paso desplegado en la fila cuando la vuelta a la
// semana lo exige (H2.4).
function FormularioPasoInline({
  tareaId,
  alResponder,
}: {
  tareaId: string;
  alResponder: (r: EstadoTransicion) => void;
}) {
  const [estado, enviar, pendiente] = useActionState(cambiarEstadoTareaAction, null);
  useEffect(() => {
    if (estado) alResponder(estado);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estado]);
  return (
    <form action={enviar} className="mt-2 flex flex-wrap items-center gap-2">
      <input type="hidden" name="tarea_id" value={tareaId} />
      <input type="hidden" name="destino" value="semana" />
      <input
        type="text"
        name="siguiente_paso"
        autoFocus
        placeholder="Siguiente paso antes de devolverla a la semana"
        className="w-full max-w-sm rounded-lg border border-linea bg-superficie px-3 py-1.5 text-[0.8125rem] text-tinta placeholder:text-tinta-tenue"
      />
      <Button type="submit" variant="secondary" size="sm" disabled={pendiente}>
        Devolver a la semana
      </Button>
    </form>
  );
}
