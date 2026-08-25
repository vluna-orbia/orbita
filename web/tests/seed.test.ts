// Test de integración del seed del encargo 2. Necesita DATABASE_URL
// apuntando a una base con la migración aplicada y el seed cargado
// (npm run db:deploy && npm run db:seed).

import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashContenido } from "../src/lib/brief";

const db = new PrismaClient();

const SLUGS = ["yajoma", "cribo", "orbia", "orbita", "flujo-specs"];
const ACENTOS: Record<string, string> = {
  yajoma: "#B99C4A",
  cribo: "#5B6B73",
  orbia: "#C97B5A",
  orbita: "#3D3A54",
  "flujo-specs": "#5F7A5B",
};

describe("seed del encargo 2", () => {
  it("carga los cinco proyectos con su acento, orden y tipo", async () => {
    const proyectos = await db.project.findMany({ orderBy: { orden: "asc" } });
    expect(proyectos).toHaveLength(5);
    expect(proyectos.map((p) => p.slug)).toEqual(SLUGS);
    for (const p of proyectos) {
      expect(p.estado).toBe("activo");
      expect(p.tipo).toBe("entrega");
      expect(p.color_acento).toBe(ACENTOS[p.slug]);
      expect(p.objetivo.length).toBeGreaterThan(0);
      expect(p.objetivo.length).toBeLessThanOrEqual(280);
    }
  });

  it("cada proyecto tiene brief versión 1 con hash coherente y seis secciones con contenido", async () => {
    const briefs = await db.projectBrief.findMany();
    expect(briefs).toHaveLength(5);
    for (const b of briefs) {
      expect(b.version).toBe(1);
      expect(b.content_hash).toBe(hashContenido(b.contenido_md));
      const secciones = b.secciones as Record<string, string>;
      for (const clave of [
        "contexto",
        "objetivos",
        "requerimientos",
        "stack",
        "decisiones_abiertas",
        "riesgos",
      ]) {
        expect(secciones[clave], `sección ${clave} del brief`).toBeTruthy();
      }
    }
  });

  it("el playbook base tiene las reglas R1 a R6 activas, con R6 de la adenda 04", async () => {
    const playbook = await db.playbook.findFirst({ include: { rules: true } });
    expect(playbook?.version).toBe(1);
    const reglas = playbook?.rules ?? [];
    expect(reglas).toHaveLength(6);
    expect(reglas.map((r) => r.clave).sort()).toEqual(["R1", "R2", "R3", "R4", "R5", "R6"]);
    expect(reglas.every((r) => r.activa)).toBe(true);
    const r6 = reglas.find((r) => r.clave === "R6");
    expect(r6?.texto).toBe(
      "Toda decisión con más de una opción viable se registra antes de ejecutarla, con las opciones consideradas y el motivo de la elegida."
    );
    expect((r6?.parametros as { dias_umbral?: number })?.dias_umbral).toBe(21);
    const r1 = reglas.find((r) => r.clave === "R1");
    expect(r1?.validacion_dura).toBe(true);
  });

  it("hay diecisiete decisiones abiertas: diez de Yajoma y siete de Cribo", async () => {
    const decisiones = await db.decision.findMany({ include: { project: true } });
    expect(decisiones).toHaveLength(17);
    const porProyecto = new Map<string, number>();
    for (const d of decisiones) {
      porProyecto.set(d.project.slug, (porProyecto.get(d.project.slug) ?? 0) + 1);
      expect(d.estado).toBe("abierta");
      expect(d.cerrada_el).toBeNull();
      expect(Array.isArray(d.opciones)).toBe(true);
      expect((d.opciones as string[]).length).toBeGreaterThanOrEqual(2);
      expect(d.abierta_desde.getTime()).toBeLessThanOrEqual(Date.now());
      expect(d.dias_abierta).toBeGreaterThanOrEqual(0);
    }
    expect(porProyecto.get("yajoma")).toBe(10);
    expect(porProyecto.get("cribo")).toBe(7);
  });

  it("Flujo de specs tiene tres hitos ordenados que suman 80 horas", async () => {
    const hitos = await db.milestone.findMany({
      where: { project: { slug: "flujo-specs" } },
      orderBy: { orden: "asc" },
    });
    expect(hitos).toHaveLength(3);
    expect(hitos.map((h) => h.orden)).toEqual([1, 2, 3]);
    expect(hitos.reduce((s, h) => s + h.estimacion_h, 0)).toBe(80);
    expect(hitos.every((h) => h.completado_el === null)).toBe(true);
    expect(await db.milestone.count()).toBe(3);
  });

  it("todas las filas llevan el user_id fijo", async () => {
    const [proyectos, briefs, reglas, decisiones, hitos] = await Promise.all([
      db.project.findMany(),
      db.projectBrief.findMany(),
      db.playbookRule.findMany(),
      db.decision.findMany(),
      db.milestone.findMany(),
    ]);
    const filas = [...proyectos, ...briefs, ...reglas, ...decisiones, ...hitos];
    expect(filas.length).toBeGreaterThan(0);
    expect(filas.every((f) => f.user_id === "vluna")).toBe(true);
  });
});

afterAll(() => db.$disconnect());
