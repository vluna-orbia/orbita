// Tests de integración del cierre de decisiones (adenda 04) y de la
// resolución de la DUDA 2: dias_abierta calculado al leer en las abiertas
// y congelado en la columna al cerrar. Crean sus datos y los borran.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { cerrarDecision, decisionesAbiertas } from "../src/lib/servicio-proyectos";

const db = new PrismaClient();

let proyectoId = "";
let decisionId = "";
const abiertaDesde = new Date(Date.now() - 30 * 86_400_000);

beforeAll(async () => {
  const proyecto = await db.project.create({
    data: {
      user_id: "vluna",
      nombre: "Decisiones de prueba encargo 3",
      slug: "decisiones-de-prueba-encargo-3",
      objetivo: "Probar el cierre de decisiones.",
      estado: "pausado",
      color_acento: "#8A6A7B",
      orden: 99,
      tipo: "entrega",
    },
  });
  proyectoId = proyecto.id;
  const decision = await db.decision.create({
    data: {
      user_id: "vluna",
      project_id: proyecto.id,
      titulo: "Decisión de prueba",
      opciones: ["Opción A", "Opción B"],
      bloqueado_por: "Nadie",
      estado: "abierta",
      abierta_desde: abiertaDesde,
      // La columna guarda un valor desfasado a propósito: mientras la
      // decisión está abierta no debe leerse de aquí.
      dias_abierta: 0,
    },
  });
  decisionId = decision.id;
});

afterAll(async () => {
  await db.project.deleteMany({ where: { slug: "decisiones-de-prueba-encargo-3" } });
  await db.$disconnect();
});

describe("dias_abierta se calcula al leer mientras está abierta (DUDA 2)", () => {
  it("el listado ignora la columna y deriva los días de abierta_desde", async () => {
    const abiertas = await decisionesAbiertas(db, proyectoId);
    expect(abiertas).toHaveLength(1);
    expect(abiertas[0].diasAbierta).toBe(30);
    expect(abiertas[0].opciones).toEqual(["Opción A", "Opción B"]);
    expect(abiertas[0].bloqueadoPor).toBe("Nadie");
  });
});

describe("cierre de una decisión", () => {
  it("rechaza una opción que no está entre las consideradas", async () => {
    const resultado = await cerrarDecision(db, decisionId, "Opción C", "un motivo");
    expect(resultado.ok).toBe(false);
  });

  it("rechaza el cierre sin motivo", async () => {
    const resultado = await cerrarDecision(db, decisionId, "Opción A", "   ");
    expect(resultado.ok).toBe(false);
  });

  it("registra opción y motivo, pasa a cerrada, guarda cerrada_el y congela los días", async () => {
    const resultado = await cerrarDecision(db, decisionId, "Opción A", "La A cuesta menos.");
    expect(resultado.ok).toBe(true);

    const decision = await db.decision.findUnique({ where: { id: decisionId } });
    expect(decision?.estado).toBe("cerrada");
    expect(decision?.opcion_elegida).toBe("Opción A");
    expect(decision?.motivo).toBe("La A cuesta menos.");
    expect(decision?.cerrada_el).not.toBeNull();
    // Congelado al cerrar: días entre abierta_desde y cerrada_el.
    expect(decision?.dias_abierta).toBe(30);

    // Y desaparece del listado de abiertas.
    expect(await decisionesAbiertas(db, proyectoId)).toHaveLength(0);
  });

  it("una decisión cerrada no se puede volver a cerrar", async () => {
    const resultado = await cerrarDecision(db, decisionId, "Opción B", "otro motivo");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain("ya no está abierta");
    const decision = await db.decision.findUnique({ where: { id: decisionId } });
    expect(decision?.opcion_elegida).toBe("Opción A");
  });
});
