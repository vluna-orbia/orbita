// Tests de integración del cierre de decisiones (adenda 04) y de la
// resolución de la DUDA 2: dias_abierta calculado al leer en las abiertas
// y congelado en la columna al cerrar. Crean sus datos y los borran.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  actualizarDecision,
  cerrarDecision,
  crearDecision,
  decisionesAbiertas,
} from "../src/lib/servicio-proyectos";

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

// ---------- Alta y edición desde la interfaz (encargo 4b) ----------

async function proyectoDeUsarYTirar(estado: "activo" | "pausado" | "archivado") {
  return db.project.create({
    data: {
      user_id: "vluna",
      nombre: `Alta de decisiones ${estado} ${Date.now()}`,
      slug: `alta-decisiones-${estado}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      objetivo: "Probar el alta y la edición de decisiones.",
      estado,
      color_acento: "#8A6A7B",
      orden: 98,
      tipo: "entrega",
    },
  });
}

async function borrar(projectId: string) {
  await db.decision.deleteMany({ where: { project_id: projectId } });
  await db.project.delete({ where: { id: projectId } });
}

describe("alta de decisiones (encargo 4b)", () => {
  it("crea una decisión abierta con sus opciones limpias y quién la bloquea", async () => {
    const proyecto = await proyectoDeUsarYTirar("activo");
    try {
      const antes = new Date();
      const resultado = await crearDecision(db, proyecto.slug, {
        titulo: "  Elegir pasarela de pago  ",
        opciones: "Stripe\n  Stripe \nRedsys\n\n",
        bloqueadoPor: "  Banco  ",
      });
      expect(resultado.ok).toBe(true);
      const abiertas = await decisionesAbiertas(db, proyecto.id);
      expect(abiertas).toHaveLength(1);
      expect(abiertas[0].titulo).toBe("Elegir pasarela de pago");
      // Recortadas, sin vacías y sin repetidas (gana la primera aparición).
      expect(abiertas[0].opciones).toEqual(["Stripe", "Redsys"]);
      expect(abiertas[0].bloqueadoPor).toBe("Banco");
      const fila = await db.decision.findFirstOrThrow({ where: { project_id: proyecto.id } });
      expect(fila.estado).toBe("abierta");
      expect(fila.abierta_desde.getTime()).toBeGreaterThanOrEqual(antes.getTime() - 1000);
    } finally {
      await borrar(proyecto.id);
    }
  });

  it("rechaza en el servidor el título vacío y la opción única", async () => {
    const proyecto = await proyectoDeUsarYTirar("activo");
    try {
      const sinTitulo = await crearDecision(db, proyecto.slug, {
        titulo: "   ",
        opciones: "A\nB",
      });
      expect(sinTitulo.ok).toBe(false);
      const unaOpcion = await crearDecision(db, proyecto.slug, {
        titulo: "Decisión coja",
        opciones: "La única opción\n  La única opción \n",
      });
      expect(unaOpcion.ok).toBe(false);
      if (!unaOpcion.ok) expect(unaOpcion.error).toContain("dos opciones");
      expect(await db.decision.count({ where: { project_id: proyecto.id } })).toBe(0);
    } finally {
      await borrar(proyecto.id);
    }
  });

  it("un proyecto archivado no admite decisiones nuevas; uno en pausa sí", async () => {
    const archivado = await proyectoDeUsarYTirar("archivado");
    const pausado = await proyectoDeUsarYTirar("pausado");
    try {
      const rechazo = await crearDecision(db, archivado.slug, {
        titulo: "No debería entrar",
        opciones: "A\nB",
      });
      expect(rechazo.ok).toBe(false);
      if (!rechazo.ok) expect(rechazo.error).toContain("archivado");
      const admitida = await crearDecision(db, pausado.slug, {
        titulo: "En pausa se registra",
        opciones: "A\nB",
      });
      expect(admitida.ok).toBe(true);
    } finally {
      await borrar(archivado.id);
      await borrar(pausado.id);
    }
  });
});

describe("edición de decisiones abiertas (encargo 4b)", () => {
  it("edita título, opciones y quién bloquea, y permite cerrar con la opción añadida", async () => {
    const proyecto = await proyectoDeUsarYTirar("activo");
    try {
      await crearDecision(db, proyecto.slug, {
        titulo: "Dónde alojar el piloto",
        opciones: "GPU alquilada\nMáquina física",
        bloqueadoPor: "Coste mensual",
      });
      const decision = await db.decision.findFirstOrThrow({ where: { project_id: proyecto.id } });

      // La opción que gana de verdad no estaba entre las consideradas:
      // cerrar con ella se rechaza (DUDA 16)...
      const cierreFallido = await cerrarDecision(db, decision.id, "Nube gestionada", "mejor precio");
      expect(cierreFallido.ok).toBe(false);

      // ...se edita la decisión para añadirla...
      const edicion = await actualizarDecision(db, decision.id, {
        titulo: "Dónde alojar el piloto",
        opciones: "GPU alquilada\nMáquina física\nNube gestionada",
        bloqueadoPor: "",
      });
      expect(edicion.ok).toBe(true);
      const editada = await db.decision.findUniqueOrThrow({ where: { id: decision.id } });
      expect(editada.opciones).toEqual(["GPU alquilada", "Máquina física", "Nube gestionada"]);
      expect(editada.bloqueado_por).toBeNull();

      // ...y ahora el cierre con la opción nueva funciona.
      const cierre = await cerrarDecision(db, decision.id, "Nube gestionada", "coste y arranque");
      expect(cierre.ok).toBe(true);
    } finally {
      await borrar(proyecto.id);
    }
  });

  it("una decisión cerrada no se edita: es registro histórico", async () => {
    const proyecto = await proyectoDeUsarYTirar("activo");
    try {
      await crearDecision(db, proyecto.slug, { titulo: "Ya decidida", opciones: "A\nB" });
      const decision = await db.decision.findFirstOrThrow({ where: { project_id: proyecto.id } });
      await cerrarDecision(db, decision.id, "A", "porque sí");
      const intento = await actualizarDecision(db, decision.id, {
        titulo: "Reescribir la historia",
        opciones: "A\nB\nC",
      });
      expect(intento.ok).toBe(false);
      if (!intento.ok) expect(intento.error).toContain("registro histórico");
      const intacta = await db.decision.findUniqueOrThrow({ where: { id: decision.id } });
      expect(intacta.titulo).toBe("Ya decidida");
    } finally {
      await borrar(proyecto.id);
    }
  });
});
