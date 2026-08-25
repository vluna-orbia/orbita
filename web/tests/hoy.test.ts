// Tests de integración de la pantalla Hoy reducida (encargo suelto,
// adelanta parte de H7.1) contra la base con seed. Crean sus datos y los
// borran; las aserciones buscan sus propias filas por id para no depender
// de cuántas trae el seed.

import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { decisionesSobreUmbral, notasDeAyer, tareasEnCursoDeHoy } from "../src/lib/servicio-hoy";
import { rangoDeAyer } from "../src/lib/semana";

const db = new PrismaClient();
const USER_ID = "vluna";

// Instante fijo: martes 25/08/2026 a mediodía en Madrid. Ayer es el
// lunes 24, de 00:00 a 24:00 hora de Madrid (22:00 UTC a 22:00 UTC).
const AHORA = new Date("2026-08-25T12:00:00+02:00");

function diasAntes(dias: number, base: Date = AHORA): Date {
  return new Date(base.getTime() - dias * 86_400_000);
}

// Proyecto de usar y tirar para no tocar los del seed.
async function crearProyecto(estado: "activo" | "pausado") {
  return db.project.create({
    data: {
      user_id: USER_ID,
      nombre: `Prueba Hoy ${estado} ${Date.now()}`,
      slug: `prueba-hoy-${estado}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      objetivo: "Proyecto temporal de los tests de la pantalla Hoy.",
      estado,
      color_acento: "#5B6B73",
      orden: 99,
      tipo: "entrega",
    },
  });
}

async function borrarProyecto(id: string) {
  await db.workSession.deleteMany({ where: { project_id: id } });
  await db.decision.deleteMany({ where: { project_id: id } });
  await db.taskEvent.deleteMany({ where: { task: { project_id: id } } });
  await db.task.deleteMany({ where: { project_id: id } });
  await db.project.delete({ where: { id } });
}

afterAll(() => db.$disconnect());

describe("sección 1: tareas en curso", () => {
  it("devuelve las en curso con su bloqueo y excluye las de proyectos en pausa", async () => {
    const activo = await crearProyecto("activo");
    const pausado = await crearProyecto("pausado");
    try {
      const normal = await db.task.create({
        data: { user_id: USER_ID, project_id: activo.id, titulo: "En curso normal", estado: "en_curso" },
      });
      const bloqueada = await db.task.create({
        data: {
          user_id: USER_ID,
          project_id: activo.id,
          titulo: "En curso bloqueada",
          estado: "en_curso",
          motivo_bloqueo: "Esperando el visto bueno",
        },
      });
      const enSemana = await db.task.create({
        data: { user_id: USER_ID, project_id: activo.id, titulo: "De semana", estado: "semana" },
      });
      const dePausado = await db.task.create({
        data: { user_id: USER_ID, project_id: pausado.id, titulo: "De pausado", estado: "en_curso" },
      });

      const filas = await tareasEnCursoDeHoy(db);
      const ids = filas.map((t) => t.id);
      expect(ids).toContain(normal.id);
      expect(ids).toContain(bloqueada.id);
      expect(ids).not.toContain(enSemana.id);
      expect(ids).not.toContain(dePausado.id);

      const marcada = filas.find((t) => t.id === bloqueada.id);
      expect(marcada?.motivoBloqueo).toBe("Esperando el visto bueno");
      expect(marcada?.proyectoNombre).toBe(activo.nombre);
    } finally {
      await borrarProyecto(activo.id);
      await borrarProyecto(pausado.id);
    }
  });

  it("incluye las tareas en curso sin proyecto", async () => {
    const suelta = await db.task.create({
      data: { user_id: USER_ID, titulo: "En curso sin proyecto", estado: "en_curso" },
    });
    try {
      const filas = await tareasEnCursoDeHoy(db);
      expect(filas.map((t) => t.id)).toContain(suelta.id);
    } finally {
      await db.task.delete({ where: { id: suelta.id } });
    }
  });
});

describe("sección 3: notas de cierre de ayer", () => {
  it("trae solo las sesiones con nota terminadas en el día civil de ayer", async () => {
    const proyecto = await crearProyecto("activo");
    const { inicio, fin } = rangoDeAyer(AHORA);
    const sesion = (datos: {
      intencion: string;
      ended_at: Date;
      estado?: "cerrada" | "abandonada";
      nota?: string | null;
    }) =>
      db.workSession.create({
        data: {
          user_id: USER_ID,
          project_id: proyecto.id,
          intencion: datos.intencion,
          started_at: new Date(datos.ended_at.getTime() - 45 * 60_000),
          ended_at: datos.ended_at,
          duracion_min: 45,
          nota_avance: datos.nota === undefined ? "Avance registrado." : datos.nota,
          siguiente_paso: "Seguir por donde iba",
          estado: datos.estado ?? "cerrada",
        },
      });
    try {
      const deAyer = await sesion({
        intencion: "De ayer con nota",
        ended_at: new Date(inicio.getTime() + 18 * 3_600_000),
      });
      const enElBorde = await sesion({
        intencion: "Cerrada en la medianoche de hoy",
        ended_at: fin, // exactamente las 00:00 de hoy: ya no es ayer
      });
      const ultimaDeAyer = await sesion({
        intencion: "Cerrada un segundo antes de medianoche",
        ended_at: new Date(fin.getTime() - 1000),
      });
      const anteayer = await sesion({
        intencion: "De anteayer",
        ended_at: new Date(inicio.getTime() - 3_600_000),
      });
      const sinNota = await sesion({
        intencion: "De ayer sin nota",
        ended_at: new Date(inicio.getTime() + 10 * 3_600_000),
        nota: null,
      });
      const abandonadaAnotada = await sesion({
        intencion: "Abandonada ayer y anotada",
        ended_at: new Date(inicio.getTime() + 12 * 3_600_000),
        estado: "abandonada",
      });

      const notas = await notasDeAyer(db, AHORA);
      const ids = notas.map((n) => n.id);
      expect(ids).toContain(deAyer.id);
      expect(ids).toContain(ultimaDeAyer.id);
      expect(ids).toContain(abandonadaAnotada.id);
      expect(ids).not.toContain(enElBorde.id);
      expect(ids).not.toContain(anteayer.id);
      expect(ids).not.toContain(sinNota.id);

      const abandonada = notas.find((n) => n.id === abandonadaAnotada.id);
      expect(abandonada?.abandonada).toBe(true);
      expect(abandonada?.avance).toBe("Avance registrado.");
    } finally {
      await borrarProyecto(proyecto.id);
    }
  });

  it("excluye las sesiones de proyectos en pausa (H1.3: fuera del brief diario)", async () => {
    const pausado = await crearProyecto("pausado");
    const { inicio } = rangoDeAyer(AHORA);
    try {
      const s = await db.workSession.create({
        data: {
          user_id: USER_ID,
          project_id: pausado.id,
          intencion: "De proyecto pausado",
          started_at: new Date(inicio.getTime() + 9 * 3_600_000),
          ended_at: new Date(inicio.getTime() + 10 * 3_600_000),
          duracion_min: 60,
          nota_avance: "Avance en pausa.",
          estado: "cerrada",
        },
      });
      const notas = await notasDeAyer(db, AHORA);
      expect(notas.map((n) => n.id)).not.toContain(s.id);
    } finally {
      await borrarProyecto(pausado.id);
    }
  });
});

describe("sección 4: decisiones por encima del umbral de R6", () => {
  const decision = (projectId: string, titulo: string, dias: number, bloqueadoPor?: string) =>
    db.decision.create({
      data: {
        user_id: USER_ID,
        project_id: projectId,
        titulo,
        opciones: ["Opción a", "Opción b"],
        bloqueado_por: bloqueadoPor ?? null,
        estado: "abierta",
        abierta_desde: diasAntes(dias),
      },
    });

  it("trae las que superan el umbral con quién las bloquea, y respeta el umbral estricto", async () => {
    const proyecto = await crearProyecto("activo");
    try {
      const antigua = await decision(proyecto.id, "Antigua de 30 días", 30, "Solvos");
      const enElUmbral = await decision(proyecto.id, "Justo en el umbral", 21);
      const porEncima = await decision(proyecto.id, "Un día por encima", 22);
      const reciente = await decision(proyecto.id, "Reciente de 5 días", 5);

      const resultado = await decisionesSobreUmbral(db, AHORA);
      expect(resultado).not.toBeNull();
      if (!resultado) return;
      expect(resultado.umbral).toBe(21);
      const ids = resultado.decisiones.map((d) => d.id);
      expect(ids).toContain(antigua.id);
      expect(ids).toContain(porEncima.id);
      expect(ids).not.toContain(enElUmbral.id); // 21 días no es "más de 21"
      expect(ids).not.toContain(reciente.id);

      const conBloqueo = resultado.decisiones.find((d) => d.id === antigua.id);
      expect(conBloqueo?.bloqueadoPor).toBe("Solvos");
      expect(conBloqueo?.diasAbierta).toBe(30);
      expect(conBloqueo?.proyectoSlug).toBe(proyecto.slug);

      // Ordenadas de más antigua a menos.
      const dias = resultado.decisiones.map((d) => d.diasAbierta);
      expect([...dias].sort((a, b) => b - a)).toEqual(dias);
    } finally {
      await borrarProyecto(proyecto.id);
    }
  });

  it("excluye las decisiones de proyectos en pausa", async () => {
    const pausado = await crearProyecto("pausado");
    try {
      const d = await decision(pausado.id, "De proyecto pausado", 40, "Alguien");
      const resultado = await decisionesSobreUmbral(db, AHORA);
      expect(resultado?.decisiones.map((x) => x.id)).not.toContain(d.id);
    } finally {
      await borrarProyecto(pausado.id);
    }
  });

  it("lee el umbral de parametros.dias_umbral de la última versión del playbook", async () => {
    const regla = await db.playbookRule.findFirstOrThrow({
      where: { clave: "R6", retirada_el: null },
    });
    const proyecto = await crearProyecto("activo");
    await db.playbookRule.update({
      where: { id: regla.id },
      data: { parametros: { dias_umbral: 25 } },
    });
    try {
      const dentro = await decision(proyecto.id, "De 24 días con umbral 25", 24);
      const fuera = await decision(proyecto.id, "De 26 días con umbral 25", 26);
      const resultado = await decisionesSobreUmbral(db, AHORA);
      expect(resultado?.umbral).toBe(25);
      const ids = resultado?.decisiones.map((d) => d.id) ?? [];
      expect(ids).not.toContain(dentro.id);
      expect(ids).toContain(fuera.id);
    } finally {
      await db.playbookRule.update({
        where: { id: regla.id },
        data: { parametros: regla.parametros as object },
      });
      await borrarProyecto(proyecto.id);
    }
  });

  it("con R6 desactivada la sección desaparece entera", async () => {
    const regla = await db.playbookRule.findFirstOrThrow({
      where: { clave: "R6", retirada_el: null },
    });
    await db.playbookRule.update({ where: { id: regla.id }, data: { activa: false } });
    try {
      expect(await decisionesSobreUmbral(db, AHORA)).toBeNull();
    } finally {
      await db.playbookRule.update({ where: { id: regla.id }, data: { activa: true } });
    }
  });
});
