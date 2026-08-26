// Tests de integración de las métricas de adherencia (H5.3) contra la
// base con seed. Los datos viven en semanas de marzo de 2025, vacías de
// seed, para que las cuentas sean exactas. La métrica de R1 usa los
// rechazos persistidos en wip_rejections (encargo 4b) y la de R2 lee el
// límite de parametros.limite. Todo lo creado se borra al salir.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { calcularMedida, metricasDeRegla } from "../src/lib/servicio-adherencia";
import { crearVersionConCambio, versionVigente } from "../src/lib/servicio-playbook";
import { inicioDeSemana, rangoDeSemanaPura } from "../src/lib/semana";

const db = new PrismaClient();
const USER_ID = "vluna";

// Semana del lunes 3 al domingo 9 de marzo de 2025 (y la anterior).
const LUNES = new Date(Date.UTC(2025, 2, 3));
const LUNES_ANTERIOR = new Date(Date.UTC(2025, 1, 24));

function enLaSemana(dia: number, hora = 10): Date {
  return new Date(Date.UTC(2025, 2, dia, hora));
}

let proyectoId = "";
let versionBase = 0;

beforeAll(async () => {
  versionBase = (await versionVigente(db)).version;
  const proyecto = await db.project.create({
    data: {
      user_id: USER_ID,
      nombre: "Prueba adherencia",
      slug: `prueba-adherencia-${Date.now()}`,
      objetivo: "Proyecto temporal de los tests de adherencia.",
      estado: "pausado",
      color_acento: "#5B6B73",
      orden: 90,
      tipo: "entrega",
    },
  });
  proyectoId = proyecto.id;
});

afterAll(async () => {
  await db.playbook.deleteMany({ where: { version: { gt: versionBase } } });
  await db.adherenceMetric.deleteMany({ where: { semana_inicio: { lt: new Date("2026-01-01") } } });
  await db.weeklyPlan.deleteMany({ where: { semana_inicio: { lt: new Date("2026-01-01") } } });
  await db.workSession.deleteMany({ where: { project_id: proyectoId } });
  await db.decision.deleteMany({ where: { project_id: proyectoId } });
  await db.wipRejection.deleteMany({ where: { task: { project_id: proyectoId } } });
  await db.taskEvent.deleteMany({ where: { task: { project_id: proyectoId } } });
  await db.task.deleteMany({ where: { project_id: proyectoId } });
  await db.project.delete({ where: { id: proyectoId } });
  await db.$disconnect();
});

describe("cálculo semanal por regla contra la base", () => {
  it("R1 usa los rechazos persistidos sobre las transiciones a en_curso", async () => {
    const tarea = await db.task.create({
      data: { user_id: USER_ID, project_id: proyectoId, titulo: "Tarea de R1", estado: "semana" },
    });
    await db.wipRejection.create({
      data: { user_id: USER_ID, task_id: tarea.id, limite: 3, created_at: enLaSemana(4) },
    });
    for (const dia of [4, 5]) {
      await db.taskEvent.create({
        data: {
          user_id: USER_ID,
          task_id: tarea.id,
          estado_anterior: "semana",
          estado_nuevo: "en_curso",
          created_at: enLaSemana(dia),
        },
      });
    }
    expect(await calcularMedida(db, "R1", LUNES)).toEqual({ numerador: 1, denominador: 2 });
    expect(await calcularMedida(db, "R1", LUNES_ANTERIOR)).toBeNull();
  });

  it("R2 lee el límite de parametros.limite del playbook, no un 3 en duro", async () => {
    await db.weeklyPlan.create({
      data: {
        user_id: USER_ID,
        semana_inicio: LUNES,
        proyectos_activos: ["a", "b", "c", "d"],
        completado_paso: 4,
      },
    });
    // Con el límite del seed (3), cuatro activos no adhieren.
    expect(await calcularMedida(db, "R2", LUNES)).toEqual({ numerador: 0, denominador: 1 });

    // Con el límite editado a 5 en el playbook, la misma semana adhiere.
    await crearVersionConCambio(db, {
      tipo: "editar",
      clave: "R2",
      texto: "Máximo 5 proyectos activos simultáneos.",
      categoria: "foco",
      parametros: "5",
    });
    expect(await calcularMedida(db, "R2", LUNES)).toEqual({ numerador: 1, denominador: 1 });
    await db.playbook.deleteMany({ where: { version: { gt: versionBase } } });

    // Semana sin planificación: sin dato.
    expect(await calcularMedida(db, "R2", LUNES_ANTERIOR)).toBeNull();
  });

  it("R3 cuenta las cerradas con nota y las abandonadas nunca puntúan", async () => {
    const base = {
      user_id: USER_ID,
      project_id: proyectoId,
      intencion: "Sesión de prueba",
    };
    await db.workSession.create({
      data: {
        ...base,
        started_at: enLaSemana(3, 9),
        ended_at: enLaSemana(3, 11),
        duracion_min: 120,
        estado: "cerrada",
        nota_avance: "Avancé el módulo.",
        siguiente_paso: "Rematar los tests.",
      },
    });
    await db.workSession.create({
      data: {
        ...base,
        started_at: enLaSemana(4, 9),
        ended_at: enLaSemana(4, 10),
        duracion_min: 60,
        estado: "cerrada",
      },
    });
    await db.workSession.create({
      data: {
        ...base,
        started_at: enLaSemana(5, 9),
        ended_at: enLaSemana(5, 13),
        duracion_min: 240,
        estado: "abandonada",
        nota_avance: "Nota escrita después.",
        siguiente_paso: "Da igual: quedó abandonada.",
      },
    });
    expect(await calcularMedida(db, "R3", LUNES)).toEqual({ numerador: 1, denominador: 3 });
  });

  it("R4 cuenta capturas de la semana y triajes hechos en el ritual", async () => {
    const capturada = await db.task.create({
      data: { user_id: USER_ID, project_id: proyectoId, titulo: "Capturada", estado: "backlog" },
    });
    const arrastrada = await db.task.create({
      data: { user_id: USER_ID, project_id: proyectoId, titulo: "Arrastrada", estado: "backlog" },
    });
    // Dos capturas esta semana; una se tria en el ritual del lunes.
    for (const [tarea, dia] of [
      [capturada.id, 3],
      [arrastrada.id, 5],
    ] as const) {
      await db.taskEvent.create({
        data: {
          user_id: USER_ID,
          task_id: tarea,
          estado_anterior: null,
          estado_nuevo: "inbox",
          created_at: enLaSemana(dia, 8),
        },
      });
    }
    await db.taskEvent.create({
      data: {
        user_id: USER_ID,
        task_id: capturada.id,
        estado_anterior: "inbox",
        estado_nuevo: "backlog",
        via_ritual: true,
        created_at: enLaSemana(3, 9),
      },
    });
    // Un triaje fuera del ritual no cuenta en el numerador.
    await db.taskEvent.create({
      data: {
        user_id: USER_ID,
        task_id: arrastrada.id,
        estado_anterior: "inbox",
        estado_nuevo: "backlog",
        via_ritual: false,
        created_at: enLaSemana(5, 9),
      },
    });
    expect(await calcularMedida(db, "R4", LUNES)).toEqual({ numerador: 1, denominador: 2 });
  });

  it("R5 necesita retro: sin ella no hay dato; con ella, cumplidos sobre comprometidos", async () => {
    const plan = await db.weeklyPlan.findUnique({ where: { semana_inicio: LUNES } });
    await db.weeklyOutcome.create({
      data: {
        user_id: USER_ID,
        weekly_plan_id: plan!.id,
        project_id: proyectoId,
        descripcion: "Resultado cumplido",
        cumplido: true,
      },
    });
    await db.weeklyOutcome.create({
      data: {
        user_id: USER_ID,
        weekly_plan_id: plan!.id,
        project_id: proyectoId,
        descripcion: "Resultado fallido",
        cumplido: false,
      },
    });
    expect(await calcularMedida(db, "R5", LUNES)).toBeNull();

    await db.retro.create({
      data: { user_id: USER_ID, weekly_plan_id: plan!.id, metricas: {} },
    });
    expect(await calcularMedida(db, "R5", LUNES)).toEqual({ numerador: 1, denominador: 2 });
  });

  it("R6 cuenta las cerradas con motivo sobre las cerradas de la semana", async () => {
    const decision = (motivo: string | null, dia: number) =>
      db.decision.create({
        data: {
          user_id: USER_ID,
          project_id: proyectoId,
          titulo: `Decisión cerrada el día ${dia}`,
          opciones: ["a", "b"],
          estado: "cerrada",
          opcion_elegida: "a",
          motivo,
          abierta_desde: new Date(Date.UTC(2025, 1, 1)),
          cerrada_el: enLaSemana(dia),
          dias_abierta: 30,
        },
      });
    await decision("Porque el coste manda.", 4);
    await decision(null, 6);
    expect(await calcularMedida(db, "R6", LUNES)).toEqual({ numerador: 1, denominador: 2 });
  });
});

describe("el job perezoso materializa las semanas cerradas", () => {
  it("guarda la semana cerrada una vez y no la recalcula; la semana en curso va al vuelo", async () => {
    // Visto desde el martes siguiente, la semana del 3 de marzo está cerrada.
    const martesSiguiente = new Date("2025-03-11T12:00:00+01:00");
    const serie = await metricasDeRegla(db, "R3", 2, martesSiguiente);
    expect(serie).toHaveLength(2);
    expect(serie[0].semanaInicio.getTime()).toBe(LUNES.getTime());
    expect(serie[0].medida).toEqual({ numerador: 1, denominador: 3 });

    // La semana cerrada queda materializada; la en curso, no.
    const filas = await db.adherenceMetric.findMany({
      where: { rule_key: "R3", semana_inicio: { lt: new Date("2026-01-01") } },
    });
    expect(filas).toHaveLength(1);
    expect(filas[0].semana_inicio.getTime()).toBe(LUNES.getTime());

    // El dato materializado es una foto: borrar una sesión no lo cambia.
    await db.workSession.deleteMany({ where: { project_id: proyectoId, duracion_min: 60 } });
    const releida = await metricasDeRegla(db, "R3", 2, martesSiguiente);
    expect(releida[0].medida).toEqual({ numerador: 1, denominador: 3 });
    expect(
      await db.adherenceMetric.count({
        where: { rule_key: "R3", semana_inicio: { lt: new Date("2026-01-01") } },
      })
    ).toBe(1);
  });

  it("la semana en curso del seed calcula R1 con los rechazos reales", async () => {
    const ahora = new Date();
    const serie = await metricasDeRegla(db, "R1", 1, ahora);
    expect(serie).toHaveLength(1);
    expect(serie[0].semanaInicio.getTime()).toBe(inicioDeSemana(ahora).getTime());
    // El seed trae al menos un rechazo esta semana; el denominador puede
    // variar con otros tests, así que se comprueba contra la base.
    const rango = rangoDeSemanaPura(inicioDeSemana(ahora));
    const rechazos = await db.wipRejection.count({
      where: { created_at: { gte: rango.inicio, lt: rango.fin } },
    });
    expect(serie[0].medida?.numerador).toBe(rechazos);
    expect(rechazos).toBeGreaterThanOrEqual(1);
  });
});
