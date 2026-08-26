// Capa de servicio de las métricas de adherencia (H5.3). Junta los datos
// de cada semana, aplica las funciones puras de adherencia.ts y
// materializa el resultado en adherence_metrics.
//
// El "job semanal" es un cálculo perezoso e idempotente, el mismo patrón
// que la detección de sesiones huérfanas (DUDA 27): al leer la ficha de
// una regla, las semanas cerradas que aún no tienen fila se calculan y se
// guardan una vez; la semana en curso se calcula al vuelo y no se
// persiste hasta que cierra. Sin cron ni infraestructura nueva.

import type { PrismaClient } from "@prisma/client";
import {
  metricaR1,
  metricaR2,
  metricaR3,
  metricaR4,
  metricaR5,
  metricaR6,
  type ClaveConMetrica,
  type Medida,
} from "./adherencia";
import { inicioDeSemana, rangoDeSemanaPura, ultimasSemanas } from "./semana";
import type { Db } from "./servicio-proyectos";

const USER_ID = "vluna";

// Parámetro de una regla leído de la última versión del playbook. La
// métrica mide contra el parámetro vigente aunque la regla esté
// desactivada: el interruptor gobierna la validación, no la medición.
async function parametroDeRegla(
  db: Db,
  clave: string,
  campo: string,
  porDefecto: number
): Promise<number> {
  const regla = await db.playbookRule.findFirst({
    where: { clave, retirada_el: null },
    orderBy: { playbook: { version: "desc" } },
  });
  const parametros = regla?.parametros as Record<string, number> | null | undefined;
  return parametros?.[campo] ?? porDefecto;
}

// Calcula la medida de una regla para la semana cuyo lunes (fecha pura)
// se indica. Devuelve null cuando esa semana no tiene dato.
export async function calcularMedida(
  db: Db,
  clave: ClaveConMetrica,
  lunes: Date
): Promise<Medida | null> {
  const rango = rangoDeSemanaPura(lunes);
  const filtroFecha = { gte: rango.inicio, lt: rango.fin };

  if (clave === "R1") {
    const [rechazos, transiciones] = await Promise.all([
      db.wipRejection.findMany({ where: { created_at: filtroFecha }, select: { created_at: true } }),
      db.taskEvent.findMany({
        where: { estado_nuevo: "en_curso", created_at: filtroFecha },
        select: { created_at: true },
      }),
    ]);
    return metricaR1(
      rechazos.map((r) => ({ creadoEl: r.created_at })),
      transiciones.map((t) => ({ creadoEl: t.created_at })),
      rango
    );
  }

  if (clave === "R2") {
    const [plan, limite] = await Promise.all([
      db.weeklyPlan.findUnique({ where: { semana_inicio: lunes } }),
      parametroDeRegla(db, "R2", "limite", 3),
    ]);
    const activos = plan ? ((plan.proyectos_activos as string[]) ?? []).length : null;
    return metricaR2(activos, limite);
  }

  if (clave === "R3") {
    const sesiones = await db.workSession.findMany({
      where: { estado: { in: ["cerrada", "abandonada"] }, started_at: filtroFecha },
      select: { started_at: true, estado: true, nota_avance: true, siguiente_paso: true },
    });
    return metricaR3(
      sesiones.map((s) => ({
        empezadaEl: s.started_at,
        estado: s.estado as "cerrada" | "abandonada",
        conNota: Boolean(s.nota_avance && s.siguiente_paso),
      })),
      rango
    );
  }

  if (clave === "R4") {
    const [capturas, triajes] = await Promise.all([
      db.taskEvent.findMany({
        where: { estado_anterior: null, estado_nuevo: "inbox", created_at: filtroFecha },
        select: { created_at: true },
      }),
      db.taskEvent.findMany({
        where: { estado_anterior: "inbox", via_ritual: true, created_at: filtroFecha },
        select: { created_at: true },
      }),
    ]);
    return metricaR4(
      capturas.map((c) => ({ creadoEl: c.created_at })),
      triajes.map((t) => ({ creadoEl: t.created_at })),
      rango
    );
  }

  if (clave === "R5") {
    const plan = await db.weeklyPlan.findUnique({
      where: { semana_inicio: lunes },
      include: { outcomes: true, retro: true },
    });
    if (!plan) return null;
    return metricaR5(
      plan.outcomes.map((o) => ({ cumplido: o.cumplido })),
      plan.retro !== null
    );
  }

  const decisiones = await db.decision.findMany({
    where: { estado: "cerrada", cerrada_el: filtroFecha },
    select: { cerrada_el: true, motivo: true },
  });
  return metricaR6(
    decisiones.map((d) => ({
      cerradaEl: d.cerrada_el as Date,
      conMotivo: Boolean(d.motivo && d.motivo.trim() !== ""),
    })),
    rango
  );
}

export type PuntoDeAdherencia = {
  semanaInicio: Date;
  medida: Medida | null;
};

// Serie de las últimas n semanas de una regla, la más antigua primero y
// la semana en curso al final. Las semanas cerradas sin fila se calculan
// y materializan aquí (el job perezoso); las materializadas se sirven de
// la tabla; la semana en curso se calcula siempre al vuelo.
export async function metricasDeRegla(
  db: PrismaClient,
  clave: ClaveConMetrica,
  semanas = 8,
  ahora: Date = new Date()
): Promise<PuntoDeAdherencia[]> {
  const lunesActual = inicioDeSemana(ahora).getTime();
  const serie: PuntoDeAdherencia[] = [];
  for (const lunes of ultimasSemanas(semanas, ahora)) {
    if (lunes.getTime() === lunesActual) {
      serie.push({ semanaInicio: lunes, medida: await calcularMedida(db, clave, lunes) });
      continue;
    }
    const guardada = await db.adherenceMetric.findUnique({
      where: { rule_key_semana_inicio: { rule_key: clave, semana_inicio: lunes } },
    });
    if (guardada) {
      serie.push({
        semanaInicio: lunes,
        medida: { numerador: guardada.numerador, denominador: guardada.denominador },
      });
      continue;
    }
    const medida = await calcularMedida(db, clave, lunes);
    if (medida !== null) {
      await db.adherenceMetric.create({
        data: {
          user_id: USER_ID,
          rule_key: clave,
          semana_inicio: lunes,
          numerador: medida.numerador,
          denominador: medida.denominador,
        },
      });
    }
    serie.push({ semanaInicio: lunes, medida });
  }
  return serie;
}
