// Tests de integración de los rituales (H4.1, H4.2, H4.3) contra la base
// con seed. Trabajan sobre una semana futura vacía (14 de septiembre de
// 2026) para no chocar con el plan de la semana en curso del seed, y
// restauran al salir el estado de los proyectos, las tareas del inbox y
// las versiones del playbook: el seed queda como estaba.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  avanzarTrasTriaje,
  avisoDeRitual,
  convertirCambioEnRegla,
  guardarProyectosActivos,
  guardarResultados,
  guardarRetro,
  guardarTareasDeLaSemana,
  marcarResultado,
  MENSAJE_INBOX_SIN_VACIAR,
  planDeLaSemana,
  posponerRitual,
  tareasParaPaso4,
  triarEnRitual,
} from "../src/lib/servicio-rituales";
import { crearVersionConCambio, versionVigente } from "../src/lib/servicio-playbook";
import { inicioDeSemana } from "../src/lib/semana";

const db = new PrismaClient();
const USER_ID = "vluna";

// Martes 15/09/2026 a mediodía en Madrid: semana del lunes 14, sin plan.
const AHORA = new Date("2026-09-15T12:00:00+02:00");
const LUNES = inicioDeSemana(AHORA);

let proyectosAntes: { id: string; estado: string }[] = [];
let inboxAntes: { id: string; estado: string; project_id: string | null }[] = [];
let planificablesAntes: { id: string; estado: string }[] = [];
let versionBase = 0;
let inicioDelTest = new Date();
const tareasCreadas: string[] = [];

beforeAll(async () => {
  inicioDelTest = new Date();
  proyectosAntes = await db.project.findMany({ select: { id: true, estado: true } });
  inboxAntes = await db.task.findMany({
    where: { estado: "inbox" },
    select: { id: true, estado: true, project_id: true },
  });
  planificablesAntes = await db.task.findMany({
    where: { estado: { in: ["backlog", "semana"] } },
    select: { id: true, estado: true },
  });
  versionBase = (await versionVigente(db)).version;
});

afterAll(async () => {
  // Restaurar el playbook, el plan de la semana de prueba, las tareas
  // (inbox y backlog/semana) y los estados de proyecto que el ritual
  // haya tocado: el seed tiene que quedar como estaba.
  await db.playbook.deleteMany({ where: { version: { gt: versionBase } } });
  await db.ritualSnooze.deleteMany();
  await db.weeklyPlan.deleteMany({ where: { semana_inicio: LUNES } });
  await db.taskEvent.deleteMany({ where: { task_id: { in: tareasCreadas } } });
  await db.task.deleteMany({ where: { id: { in: tareasCreadas } } });
  await db.taskEvent.deleteMany({
    where: { via_ritual: true, created_at: { gte: inicioDelTest } },
  });
  for (const t of inboxAntes) {
    await db.task.update({
      where: { id: t.id },
      data: { estado: "inbox", project_id: t.project_id },
    });
  }
  for (const t of planificablesAntes) {
    await db.task.update({
      where: { id: t.id },
      data: { estado: t.estado as "backlog" },
    });
  }
  for (const p of proyectosAntes) {
    await db.project.update({
      where: { id: p.id },
      data: { estado: p.estado as "activo" },
    });
  }
  await db.$disconnect();
});

async function capturarDePrueba(titulo: string): Promise<string> {
  const tarea = await db.task.create({
    data: { user_id: USER_ID, titulo, estado: "inbox", origen: "manual" },
  });
  await db.taskEvent.create({
    data: { user_id: USER_ID, task_id: tarea.id, estado_anterior: null, estado_nuevo: "inbox" },
  });
  tareasCreadas.push(tarea.id);
  return tarea.id;
}

describe("paso 1: el inbox bloquea el avance (H4.1)", () => {
  it("no se avanza con el inbox sin vaciar; descartar cuenta como procesado", async () => {
    const pendiente = await capturarDePrueba("Elemento capturado para el ritual");
    const descartable = await capturarDePrueba("Elemento que se descarta en el ritual");

    const bloqueado = await avanzarTrasTriaje(db, AHORA);
    expect(bloqueado).toEqual({ ok: false, error: MENSAJE_INBOX_SIN_VACIAR });
    expect(await planDeLaSemana(db, AHORA)).toBeNull();

    // A backlog o semana hace falta proyecto; descartar no lo pide.
    const sinProyecto = await triarEnRitual(db, pendiente, { destino: "backlog" });
    expect(sinProyecto.ok).toBe(false);
    const triado = await triarEnRitual(db, pendiente, {
      destino: "backlog",
      proyectoSlug: "orbita",
    });
    expect(triado.ok).toBe(true);
    const descartado = await triarEnRitual(db, descartable, { destino: "descartada" });
    expect(descartado.ok).toBe(true);

    // Las transiciones del triaje quedan marcadas: numerador de R4.
    const eventos = await db.taskEvent.findMany({
      where: { task_id: { in: [pendiente, descartable] }, via_ritual: true },
    });
    expect(eventos).toHaveLength(2);
    expect(eventos.every((e) => e.estado_anterior === "inbox")).toBe(true);

    // Vaciar el resto del inbox (los elementos del seed) permite avanzar.
    const restantes = await db.task.findMany({ where: { estado: "inbox" } });
    for (const t of restantes) {
      const r = await triarEnRitual(db, t.id, { destino: "backlog", proyectoSlug: "orbia" });
      expect(r.ok).toBe(true);
    }
    const avance = await avanzarTrasTriaje(db, AHORA);
    expect(avance.ok).toBe(true);
    const plan = await planDeLaSemana(db, AHORA);
    expect(plan?.completadoPaso).toBe(1);
  });
});

describe("paso 2: proyectos activos con el límite del playbook (H4.1)", () => {
  it("rechaza pasarse del límite de parametros.limite y pausa el resto al guardar", async () => {
    const cuatro = ["yajoma", "cribo", "orbia", "orbita"];
    const pasado = await guardarProyectosActivos(db, cuatro, AHORA);
    expect(pasado.ok).toBe(false);
    if (!pasado.ok) expect(pasado.error).toContain("3 proyectos activos");

    const tres = ["yajoma", "cribo", "flujo-specs"];
    const guardado = await guardarProyectosActivos(db, tres, AHORA);
    expect(guardado.ok).toBe(true);
    const proyectos = await db.project.findMany({
      where: { estado: { in: ["activo", "pausado"] } },
      select: { slug: true, estado: true },
    });
    for (const p of proyectos) {
      expect(p.estado, p.slug).toBe(tres.includes(p.slug) ? "activo" : "pausado");
    }
    const plan = await planDeLaSemana(db, AHORA);
    expect(plan?.proyectosActivos).toEqual(tres);
    expect(plan?.completadoPaso).toBe(2);
  });

  it("el límite sale del playbook: con R2 en 5 caben cuatro; desactivada, no hay tope", async () => {
    await crearVersionConCambio(db, {
      tipo: "editar",
      clave: "R2",
      texto: "Máximo 5 proyectos activos simultáneos.",
      categoria: "foco",
      parametros: "5",
    });
    const cuatro = await guardarProyectosActivos(
      db,
      ["yajoma", "cribo", "orbia", "orbita"],
      AHORA
    );
    expect(cuatro.ok).toBe(true);

    await crearVersionConCambio(db, { tipo: "alternar", clave: "R2" });
    const cinco = await guardarProyectosActivos(
      db,
      ["yajoma", "cribo", "orbia", "orbita", "flujo-specs"],
      AHORA
    );
    expect(cinco.ok).toBe(true);

    // Restaurar el playbook y volver a la selección de tres del test previo.
    await db.playbook.deleteMany({ where: { version: { gt: versionBase } } });
    const tres = await guardarProyectosActivos(db, ["yajoma", "cribo", "flujo-specs"], AHORA);
    expect(tres.ok).toBe(true);
  });
});

describe("pasos 3 y 4: resultados y tareas de la semana (H4.1)", () => {
  it("cada proyecto activo necesita su resultado y la edición conserva lo marcado", async () => {
    const incompleto = await guardarResultados(
      db,
      [{ slug: "yajoma", descripcion: "Cerrar el flujo de pedidos" }],
      AHORA
    );
    expect(incompleto.ok).toBe(false);

    const completo = await guardarResultados(
      db,
      [
        { slug: "yajoma", descripcion: "Pedido B2B de punta a punta en staging" },
        { slug: "cribo", descripcion: "Demo de triaje con 20 documentos reales" },
        { slug: "flujo-specs", descripcion: "Plantilla de spec cerrada y publicada" },
      ],
      AHORA
    );
    expect(completo.ok).toBe(true);
    let plan = await planDeLaSemana(db, AHORA);
    expect(plan?.completadoPaso).toBe(3);
    expect(plan?.resultados).toHaveLength(3);

    // Marcar uno y reeditar la frase: el cumplido sobrevive.
    const deYajoma = plan?.resultados.find((r) => r.proyectoSlug === "yajoma");
    await marcarResultado(db, deYajoma!.id, true);
    const reedicion = await guardarResultados(
      db,
      [
        { slug: "yajoma", descripcion: "Pedido B2B completo en staging" },
        { slug: "cribo", descripcion: "Demo de triaje con 20 documentos reales" },
        { slug: "flujo-specs", descripcion: "Plantilla de spec cerrada y publicada" },
      ],
      AHORA
    );
    expect(reedicion.ok).toBe(true);
    plan = await planDeLaSemana(db, AHORA);
    const reeditado = plan?.resultados.find((r) => r.proyectoSlug === "yajoma");
    expect(reeditado?.descripcion).toBe("Pedido B2B completo en staging");
    expect(reeditado?.cumplido).toBe(true);
  });

  it("el paso 4 mueve entre backlog y semana con eventos del ritual", async () => {
    const proyectos = await tareasParaPaso4(db, AHORA);
    expect(proyectos.map((p) => p.slug)).toEqual(["yajoma", "cribo", "flujo-specs"]);

    const backlogYajoma = proyectos[0].tareas.filter((t) => t.estado === "backlog");
    expect(backlogYajoma.length).toBeGreaterThan(0);
    const yaEnSemana = proyectos
      .flatMap((p) => p.tareas)
      .filter((t) => t.estado === "semana")
      .map((t) => t.id);
    const elegida = backlogYajoma[0].id;

    // La elegida entra a semana; una de las que estaban sale al backlog.
    const seleccion = [elegida, ...yaEnSemana.slice(1)];
    const guardado = await guardarTareasDeLaSemana(db, seleccion, AHORA);
    expect(guardado.ok).toBe(true);

    const entrada = await db.task.findUnique({ where: { id: elegida } });
    expect(entrada?.estado).toBe("semana");
    if (yaEnSemana.length > 0) {
      const salida = await db.task.findUnique({ where: { id: yaEnSemana[0] } });
      expect(salida?.estado).toBe("backlog");
    }
    const eventos = await db.taskEvent.findMany({
      where: {
        task_id: elegida,
        via_ritual: true,
        estado_nuevo: "semana",
        created_at: { gte: inicioDelTest },
      },
    });
    expect(eventos).toHaveLength(1);

    const plan = await planDeLaSemana(db, AHORA);
    expect(plan?.completadoPaso).toBe(4);

    // Reentrar no duplica: sigue habiendo un único plan de esa semana.
    expect(await db.weeklyPlan.count({ where: { semana_inicio: LUNES } })).toBe(1);
  });
});

describe("retrospectiva (H4.2)", () => {
  it("guarda la retro con la foto de las métricas y no se duplica", async () => {
    const guardada = await guardarRetro(
      db,
      {
        queFunciono: "Las sesiones con intención declarada.",
        queNo: "El triaje del inbox se acumuló al viernes.",
        quePruebo: "Triar el inbox cada mañana antes de la primera sesión.",
      },
      AHORA
    );
    expect(guardada.ok).toBe(true);
    const plan = await db.weeklyPlan.findUnique({
      where: { semana_inicio: LUNES },
      include: { retro: true },
    });
    expect(plan?.retro?.que_pruebo).toContain("Triar el inbox");
    const metricas = plan?.retro?.metricas as { intentosDeSaltarWip?: number };
    expect(typeof metricas.intentosDeSaltarWip).toBe("number");

    const reescrita = await guardarRetro(
      db,
      { queFunciono: "Las sesiones.", queNo: "", quePruebo: "Triar el inbox cada mañana." },
      AHORA
    );
    expect(reescrita.ok).toBe(true);
    expect(await db.retro.count({ where: { weekly_plan_id: plan!.id } })).toBe(1);
  });

  it("qué cambio pruebo se convierte en regla propia del playbook", async () => {
    const convertida = await convertirCambioEnRegla(db, AHORA);
    expect(convertida.ok).toBe(true);
    const vigente = await versionVigente(db);
    const propia = vigente.reglas.find((r) => r.texto === "Triar el inbox cada mañana.");
    expect(propia).toBeDefined();
    expect(propia?.categoria).toBe("revisión");
    expect(propia?.validacionDura).toBe(false);
  });
});

describe("aviso de ritual pendiente (H4.3)", () => {
  it("lunes sin plan avisa y atenúa; posponer lo silencia ese día", async () => {
    // Lunes 21/09/2026: la semana siguiente no tiene plan.
    const lunes = new Date("2026-09-21T09:00:00+02:00");
    expect(await avisoDeRitual(db, lunes)).toEqual({ tipo: "plan", atenuar: true });

    await posponerRitual(db, "plan", lunes);
    expect(await avisoDeRitual(db, lunes)).toBeNull();

    // Un martes no toca aviso aunque el plan siga sin hacerse.
    const martes = new Date("2026-09-22T09:00:00+02:00");
    expect(await avisoDeRitual(db, martes)).toBeNull();
  });

  it("viernes con el plan hecho y sin retro avisa sin atenuar", async () => {
    // Viernes 18/09/2026: la semana de prueba tiene plan completo y retro
    // guardada por los tests anteriores, así que no avisa.
    const viernes = new Date("2026-09-18T09:00:00+02:00");
    expect(await avisoDeRitual(db, viernes)).toBeNull();

    // Sin la retro, avisa sin atenuar.
    const plan = await db.weeklyPlan.findUnique({ where: { semana_inicio: LUNES } });
    await db.retro.deleteMany({ where: { weekly_plan_id: plan!.id } });
    expect(await avisoDeRitual(db, viernes)).toEqual({ tipo: "retro", atenuar: false });

    await posponerRitual(db, "retro", viernes);
    expect(await avisoDeRitual(db, viernes)).toBeNull();
  });
});
