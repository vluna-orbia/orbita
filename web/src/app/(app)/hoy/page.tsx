// Pantalla Hoy reducida (encargo suelto, adelanta parte de H7.1). Cuatro
// secciones en este orden: tareas en curso con las bloqueadas marcadas,
// sesión activa o botón de empezar, notas de cierre de ayer (día civil en
// Europe/Madrid) y decisiones abiertas por encima del umbral de R6 con
// quién las bloquea. Una sección sin contenido se omite por completo.
// Hallazgos y resultados comprometidos llegan con la pantalla completa
// del encargo 7.

import { DecisionesHoy } from "@/components/decisiones-hoy";
import { FilaTarea } from "@/components/fila-tarea";
import { NotasDeAyer } from "@/components/notas-de-ayer";
import { SesionHoy } from "@/components/sesion-hoy";
import { prisma } from "@/lib/prisma";
import { decisionesSobreUmbral, notasDeAyer, tareasEnCursoDeHoy } from "@/lib/servicio-hoy";
import { sesionActiva } from "@/lib/servicio-sesiones";

// El brief diario se compone con la fecha del momento, no con la del build.
export const dynamic = "force-dynamic";

function fechaDeHoy(): string {
  const texto = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  })
    .format(new Date())
    .replace(",", "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default async function Hoy() {
  const [tareas, sesion, notas, decisiones] = await Promise.all([
    tareasEnCursoDeHoy(prisma),
    sesionActiva(prisma),
    notasDeAyer(prisma),
    decisionesSobreUmbral(prisma),
  ]);

  const sinNada =
    tareas.length === 0 && notas.length === 0 && (decisiones?.decisiones.length ?? 0) === 0;

  return (
    <>
      <p className="t-micro text-tinta-tenue">{fechaDeHoy()}</p>
      <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">Tres cosas hoy</h1>

      {tareas.length > 0 ? (
        <section className="mt-8" aria-label="Tareas en curso">
          <h2 className="text-[1.25rem] font-semibold leading-[1.3]">En curso</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {tareas.map((t) => (
              <FilaTarea key={t.id} tarea={t} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-8" aria-label="Sesión de trabajo">
        <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Sesión</h2>
        <SesionHoy sesion={sesion} />
      </section>

      {notas.length > 0 ? (
        <section className="mt-8" aria-label="Notas de cierre de ayer">
          <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Notas de cierre de ayer</h2>
          <NotasDeAyer notas={notas} />
        </section>
      ) : null}

      {decisiones && decisiones.decisiones.length > 0 ? (
        <section className="mt-8" aria-label="Decisiones bloqueadas">
          <h2 className="text-[1.25rem] font-semibold leading-[1.3]">Decisiones bloqueadas</h2>
          <p className="mt-1 text-[0.8125rem] leading-[1.5] text-tinta-tenue">
            Abiertas desde hace más de {decisiones.umbral} días (regla R6). La lista de a quién
            perseguir.
          </p>
          <DecisionesHoy decisiones={decisiones.decisiones} />
        </section>
      ) : null}

      {sinNada ? (
        <p className="mt-8 max-w-[68ch] text-[0.9375rem] leading-[1.6] text-tinta-media">
          Nada en curso, sin notas de ayer y sin decisiones esperando. Captura con la tecla c o
          empieza una sesión.
        </p>
      ) : null}
    </>
  );
}
