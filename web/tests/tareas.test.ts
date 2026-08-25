// Tests de integración del encargo 4 (tareas) contra la base con seed.
// Crean sus datos y los borran: la base queda como estaba. El "intento de
// saltarse el límite llamando directamente a la API" es exactamente esto:
// las server actions son envoltorios finos de servicio-tareas, así que
// llamar al servicio con destino en_curso es llamar a la API sin cliente.

import { afterAll, afterEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  bloquearTarea,
  cambiarEstadoTarea,
  capturarTarea,
  desbloquearTarea,
  limiteWip,
  listaDeTareas,
  tareasEnCursoQueCuentan,
} from "../src/lib/servicio-tareas";

const db = new PrismaClient();
const creadas: string[] = [];

async function capturar(texto: string): Promise<string> {
  const r = await capturarTarea(db, texto);
  if (!r.ok) throw new Error(r.error);
  creadas.push(r.tareaId);
  return r.tareaId;
}

async function mover(id: string, destino: string, siguientePaso?: string) {
  return cambiarEstadoTarea(db, id, destino, { siguientePaso });
}

afterEach(async () => {
  await db.taskEvent.deleteMany({ where: { task_id: { in: creadas } } });
  await db.task.deleteMany({ where: { id: { in: creadas } } });
  creadas.length = 0;
});

afterAll(() => db.$disconnect());

describe("captura al inbox (H2.1)", () => {
  it("crea en inbox sin proyecto y registra el evento de creación", async () => {
    const id = await capturar("Probar la captura de integración");
    const tarea = await db.task.findUnique({ where: { id }, include: { events: true } });
    expect(tarea?.estado).toBe("inbox");
    expect(tarea?.project_id).toBeNull();
    expect(tarea?.events).toHaveLength(1);
    expect(tarea?.events[0].estado_anterior).toBeNull();
    expect(tarea?.events[0].estado_nuevo).toBe("inbox");
  });

  it("con @proyecto asigna el proyecto en línea", async () => {
    const r = await capturarTarea(db, "Revisar el push de pedidos @yajoma");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    creadas.push(r.tareaId);
    expect(r.proyectoAsignado).toBe("Yajoma");
    const tarea = await db.task.findUnique({
      where: { id: r.tareaId },
      include: { project: true },
    });
    expect(tarea?.project?.slug).toBe("yajoma");
    expect(tarea?.titulo).toBe("Revisar el push de pedidos");
  });
});

describe("máquina de estados con registro (H2.2)", () => {
  it("cada transición queda en el log con su estado anterior", async () => {
    const id = await capturar("Tarea con historial");
    await mover(id, "backlog");
    await mover(id, "semana");
    const eventos = await db.taskEvent.findMany({
      where: { task_id: id },
      orderBy: { created_at: "asc" },
    });
    expect(eventos.map((e) => [e.estado_anterior, e.estado_nuevo])).toEqual([
      [null, "inbox"],
      ["inbox", "backlog"],
      ["backlog", "semana"],
    ]);
  });

  it("rechaza pasar a en_curso desde inbox, y no deja rastro", async () => {
    const id = await capturar("No se empieza desde el inbox");
    const r = await mover(id, "en_curso");
    expect(r.ok).toBe(false);
    const tarea = await db.task.findUnique({ where: { id }, include: { events: true } });
    expect(tarea?.estado).toBe("inbox");
    expect(tarea?.events).toHaveLength(1);
  });

  it("marcar hecha registra completed_at", async () => {
    const id = await capturar("Tarea que se termina");
    await mover(id, "semana");
    const r = await mover(id, "hecha");
    expect(r.ok).toBe(true);
    const tarea = await db.task.findUnique({ where: { id } });
    expect(tarea?.completed_at).not.toBeNull();
  });
});

describe("límite de WIP en el servidor (H2.3)", () => {
  it("rechaza la cuarta en curso llamando directamente a la API, con las tres actuales", async () => {
    const limite = await limiteWip(db);
    expect(limite).toBe(3);
    // El seed deja 2 en curso que cuentan: llenamos la tercera plaza.
    const primera = await capturar("Llenar la tercera plaza");
    await mover(primera, "semana");
    expect((await mover(primera, "en_curso")).ok).toBe(true);

    const cuarta = await capturar("La cuarta debe rebotar");
    await mover(cuarta, "semana");
    const r = await mover(cuarta, "en_curso");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe("Ya tienes 3 tareas en curso. Cierra una antes de empezar otra.");
    expect(r.limiteWip).toHaveLength(3);
    expect(r.limiteWip?.map((t) => t.titulo)).toContain("Llenar la tercera plaza");
    // La tarea no se movió y no hay evento fantasma.
    const tarea = await db.task.findUnique({ where: { id: cuarta }, include: { events: true } });
    expect(tarea?.estado).toBe("semana");
    expect(tarea?.events.map((e) => e.estado_nuevo)).toEqual(["inbox", "semana"]);
  });

  it("las bloqueadas no cuentan para el límite (H2.5)", async () => {
    const primera = await capturar("Ocupa plaza y luego se bloquea");
    await mover(primera, "semana");
    expect((await mover(primera, "en_curso")).ok).toBe(true);
    // Con la tercera plaza ocupada, bloquearla la libera.
    expect((await bloquearTarea(db, primera, "Esperando a un tercero")).ok).toBe(true);
    const segunda = await capturar("Entra porque la bloqueada no cuenta");
    await mover(segunda, "semana");
    expect((await mover(segunda, "en_curso")).ok).toBe(true);
    // Desbloquear no expulsa a nadie, pero vuelve a contar.
    expect((await desbloquearTarea(db, primera)).ok).toBe(true);
    expect((await tareasEnCursoQueCuentan(db)).length).toBe(4);
  });

  it("las tareas de un proyecto en pausa no cuentan ni validan (H1.3)", async () => {
    const proyecto = await db.project.create({
      data: {
        user_id: "vluna",
        nombre: "Proyecto en pausa de prueba",
        slug: "prueba-pausado-e4",
        objetivo: "Comprobar que sus tareas no cuentan para el WIP.",
        estado: "pausado",
        color_acento: "#8A6A7B",
        orden: 99,
      },
    });
    try {
      const id = await capturar("Tarea de proyecto pausado @prueba-pausado-e4");
      await mover(id, "semana");
      // Llenamos la tercera plaza con una tarea sin proyecto.
      const llena = await capturar("Tercera plaza ocupada");
      await mover(llena, "semana");
      expect((await mover(llena, "en_curso")).ok).toBe(true);
      // La del proyecto pausado entra igualmente: no ocupa plaza.
      expect((await mover(id, "en_curso")).ok).toBe(true);
      const cuentan = await tareasEnCursoQueCuentan(db);
      expect(cuentan.map((t) => t.titulo)).not.toContain("Tarea de proyecto pausado");
    } finally {
      await db.taskEvent.deleteMany({ where: { task: { project_id: proyecto.id } } });
      await db.task.deleteMany({ where: { project_id: proyecto.id } });
      await db.project.delete({ where: { id: proyecto.id } });
    }
  });

  it("desactivar R1 desactiva la validación de verdad", async () => {
    const regla = await db.playbookRule.findFirstOrThrow({ where: { clave: "R1" } });
    await db.playbookRule.update({ where: { id: regla.id }, data: { activa: false } });
    try {
      expect(await limiteWip(db)).toBeNull();
      const ids: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const id = await capturar(`Sin límite ${i}`);
        await mover(id, "semana");
        const r = await mover(id, "en_curso");
        expect(r.ok).toBe(true);
        ids.push(id);
      }
      expect(ids).toHaveLength(3);
    } finally {
      await db.playbookRule.update({ where: { id: regla.id }, data: { activa: true } });
    }
  });
});

describe("siguiente paso obligatorio al salir de en_curso (H2.4)", () => {
  it("volver a semana sin siguiente paso se rechaza y con él se guarda", async () => {
    const id = await capturar("Tarea que vuelve a la semana");
    await mover(id, "semana");
    expect((await mover(id, "en_curso")).ok).toBe(true);
    const sinPaso = await mover(id, "semana");
    expect(sinPaso.ok).toBe(false);
    if (!sinPaso.ok) expect(sinPaso.pideSiguientePaso).toBe(true);
    const conPaso = await mover(id, "semana", "Terminar la migración del mapa");
    expect(conPaso.ok).toBe(true);
    const tarea = await db.task.findUnique({ where: { id } });
    expect(tarea?.estado).toBe("semana");
    expect(tarea?.siguiente_paso).toBe("Terminar la migración del mapa");
  });
});

describe("vista filtrable (H2.6)", () => {
  it("filtra por proyecto, estado y vencimiento", async () => {
    const porProyecto = await listaDeTareas(db, { proyecto: "yajoma" });
    expect(porProyecto.length).toBeGreaterThan(0);
    expect(porProyecto.every((t) => t.proyectoSlug === "yajoma")).toBe(true);

    const enCurso = await listaDeTareas(db, { estado: "en_curso" });
    expect(enCurso.every((t) => t.estado === "en_curso")).toBe(true);

    const sinProyecto = await listaDeTareas(db, { proyecto: "sin-proyecto" });
    expect(sinProyecto.every((t) => t.proyectoSlug === null)).toBe(true);

    const vencidas = await listaDeTareas(db, { vencimiento: "vencidas" });
    expect(vencidas.length).toBeGreaterThan(0);
    expect(
      vencidas.every((t) => t.venceEl !== null && t.venceEl.getTime() < Date.now())
    ).toBe(true);

    // Sin filtro de estado, las terminadas no aparecen.
    const abiertas = await listaDeTareas(db, {});
    expect(abiertas.some((t) => t.estado === "hecha" || t.estado === "descartada")).toBe(false);
  });
});
