// Tests de integración del encargo 4 (sesiones) contra la base con seed.
// Crean sus datos y los borran. La duración se comprueba pasando el reloj
// como parámetro: el servidor calcula desde started_at, nunca el cliente.

import { afterAll, afterEach, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  cerrarSesion,
  empezarSesion,
  historialDeSesiones,
  latidoDeSesion,
  r3Activa,
  sesionActiva,
  sesionesPendientesDeNota,
} from "../src/lib/servicio-sesiones";

const db = new PrismaClient();
const sesionesCreadas: string[] = [];
const tareasCreadas: string[] = [];

const NOTA = {
  avance: "Avance de prueba",
  bloqueo: "",
  siguientePaso: "Siguiente paso de prueba",
};

async function empezar(slug = "yajoma", intencion = "Sesión de prueba", tareaId?: string) {
  const r = await empezarSesion(db, { proyectoSlug: slug, intencion, tareaId });
  if (!r.ok) throw new Error(r.error);
  sesionesCreadas.push(r.sesionId);
  return r.sesionId;
}

afterEach(async () => {
  await db.workSession.deleteMany({ where: { id: { in: sesionesCreadas } } });
  await db.taskEvent.deleteMany({ where: { task_id: { in: tareasCreadas } } });
  await db.task.deleteMany({ where: { id: { in: tareasCreadas } } });
  sesionesCreadas.length = 0;
  tareasCreadas.length = 0;
});

afterAll(() => db.$disconnect());

describe("arranque con intención declarada (H3.1)", () => {
  it("exige intención y proyecto existente", async () => {
    const sinIntencion = await empezarSesion(db, { proyectoSlug: "yajoma", intencion: "  " });
    expect(sinIntencion.ok).toBe(false);
    const sinProyecto = await empezarSesion(db, {
      proyectoSlug: "no-existe",
      intencion: "Da igual",
    });
    expect(sinProyecto.ok).toBe(false);
  });

  it("solo puede haber una sesión activa: la segunda se rechaza", async () => {
    await empezar();
    const segunda = await empezarSesion(db, {
      proyectoSlug: "cribo",
      intencion: "Otra a la vez",
    });
    expect(segunda.ok).toBe(false);
    if (!segunda.ok) {
      expect(segunda.error).toBe("Ya hay una sesión en curso. Ciérrala antes de empezar otra.");
    }
  });

  it("la tarea vinculada tiene que ser del proyecto de la sesión", async () => {
    const tareaDeOtro = await db.task.findFirstOrThrow({
      where: { project: { slug: "cribo" }, estado: "semana" },
    });
    const r = await empezarSesion(db, {
      proyectoSlug: "yajoma",
      intencion: "Con tarea de otro proyecto",
      tareaId: tareaDeOtro.id,
    });
    expect(r.ok).toBe(false);
  });
});

describe("cierre con nota (H3.2)", () => {
  it("la duración se calcula desde started_at en el servidor", async () => {
    const id = await empezar();
    // Retrasamos started_at 50 minutos por SQL crudo: updated_at no se toca.
    await db.$executeRaw`UPDATE work_sessions SET started_at = started_at - interval '50 minutes' WHERE id = ${id}`;
    const r = await cerrarSesion(db, id, NOTA);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.duracionMin).toBeGreaterThanOrEqual(50);
    const sesion = await db.workSession.findUnique({ where: { id } });
    expect(sesion?.estado).toBe("cerrada");
    expect(sesion?.duracion_min).toBe(r.ok ? r.duracionMin : -1);
    expect(sesion?.ended_at).not.toBeNull();
  });

  it("con R3 activa no se cierra sin siguiente paso; el doble cierre se rechaza", async () => {
    expect(await r3Activa(db)).toBe(true);
    const id = await empezar();
    const sinPaso = await cerrarSesion(db, id, { ...NOTA, siguientePaso: "" });
    expect(sinPaso.ok).toBe(false);
    const bien = await cerrarSesion(db, id, NOTA);
    expect(bien.ok).toBe(true);
    const otraVez = await cerrarSesion(db, id, NOTA);
    expect(otraVez.ok).toBe(false);
  });

  it("con R3 desactivada se puede cerrar sin siguiente paso", async () => {
    const regla = await db.playbookRule.findFirstOrThrow({ where: { clave: "R3" } });
    await db.playbookRule.update({ where: { id: regla.id }, data: { activa: false } });
    try {
      const id = await empezar();
      const r = await cerrarSesion(db, id, { ...NOTA, siguientePaso: "" });
      expect(r.ok).toBe(true);
    } finally {
      await db.playbookRule.update({ where: { id: regla.id }, data: { activa: true } });
    }
  });

  it("el siguiente paso se copia a la tarea vinculada", async () => {
    const tarea = await db.task.create({
      data: {
        user_id: "vluna",
        project_id: (await db.project.findUniqueOrThrow({ where: { slug: "yajoma" } })).id,
        titulo: "Tarea vinculada a la sesión",
        estado: "semana",
      },
    });
    tareasCreadas.push(tarea.id);
    const id = await empezar("yajoma", "Avanzar la tarea vinculada", tarea.id);
    const r = await cerrarSesion(db, id, { ...NOTA, siguientePaso: "Probar en development" });
    expect(r.ok).toBe(true);
    const releida = await db.task.findUnique({ where: { id: tarea.id } });
    expect(releida?.siguiente_paso).toBe("Probar en development");
  });
});

describe("sesión huérfana (H3.3)", () => {
  it("pasadas 4 horas sin actividad queda abandonada y pide la nota al entrar", async () => {
    const id = await empezar("orbia", "Sesión que quedará huérfana");
    const dentroDe5h = new Date(Date.now() + 5 * 3_600_000);
    // La lectura de la sesión activa detecta la huérfana y la abandona.
    expect(await sesionActiva(db, dentroDe5h)).toBeNull();
    const sesion = await db.workSession.findUnique({ where: { id } });
    expect(sesion?.estado).toBe("abandonada");
    expect(sesion?.ended_at).not.toBeNull();
    expect(sesion?.duracion_min).not.toBeNull();
    // Pendiente de nota hasta que se escribe; al escribirla sigue
    // contando como abandonada para las métricas del encargo 5.
    const pendientes = await sesionesPendientesDeNota(db);
    expect(pendientes.map((p) => p.id)).toContain(id);
    const r = await cerrarSesion(db, id, NOTA);
    expect(r.ok).toBe(true);
    const cerrada = await db.workSession.findUnique({ where: { id } });
    expect(cerrada?.estado).toBe("abandonada");
    expect((await sesionesPendientesDeNota(db)).map((p) => p.id)).not.toContain(id);
  });

  it("el latido del cronómetro aplaza la detección", async () => {
    const id = await empezar("orbia", "Sesión con latido");
    await latidoDeSesion(db, id);
    const sesion = await db.workSession.findUniqueOrThrow({ where: { id } });
    const casiCuatroHoras = new Date(sesion.updated_at.getTime() + 3.9 * 3_600_000);
    expect(await sesionActiva(db, casiCuatroHoras)).not.toBeNull();
  });

  it("una huérfana no bloquea el arranque de la siguiente", async () => {
    const primera = await empezar("orbia", "Huérfana que no estorba");
    await db.$executeRaw`UPDATE work_sessions SET started_at = started_at - interval '5 hours', updated_at = updated_at - interval '5 hours' WHERE id = ${primera}`;
    const segunda = await empezarSesion(db, {
      proyectoSlug: "cribo",
      intencion: "Arranca aunque la anterior quedara abierta",
    });
    expect(segunda.ok).toBe(true);
    if (segunda.ok) sesionesCreadas.push(segunda.sesionId);
    const huerfana = await db.workSession.findUnique({ where: { id: primera } });
    expect(huerfana?.estado).toBe("abandonada");
  });
});

describe("historial por proyecto y semana (H3.4)", () => {
  it("agrega número, minutos y porcentaje con nota por semana", async () => {
    const yajoma = await db.project.findUniqueOrThrow({ where: { slug: "yajoma" } });
    const historial = await historialDeSesiones(db, yajoma.id);
    expect(historial.length).toBeGreaterThanOrEqual(2);
    for (const semana of historial) {
      expect(semana.sesiones).toBeGreaterThan(0);
      expect(semana.minutos).toBeGreaterThan(0);
      expect(semana.porcentajeConNota).toBeGreaterThanOrEqual(0);
      expect(semana.porcentajeConNota).toBeLessThanOrEqual(100);
      // El lunes de la semana, como fecha pura.
      expect(semana.semanaInicio.getUTCDay()).toBe(1);
    }
    // Las semanas vienen de más reciente a más antigua.
    const tiempos = historial.map((h) => h.semanaInicio.getTime());
    expect([...tiempos].sort((a, b) => b - a)).toEqual(tiempos);
  });
});
