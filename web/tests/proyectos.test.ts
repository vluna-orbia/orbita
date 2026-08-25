// Tests de integración del encargo 3 (proyectos y brief vivo). Necesitan
// DATABASE_URL con la migración aplicada y el seed cargado. Crean sus
// propios datos y los borran al terminar: no tocan los del seed.

import { afterAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import { hashContenido } from "../src/lib/brief";
import {
  briefCambioDesdeDerivacion,
  cambiarEstadoProyecto,
  crearProyecto,
  guardarBrief,
  resumenDeProyecto,
  resumenDeProyectos,
} from "../src/lib/servicio-proyectos";

const db = new PrismaClient();
const NOMBRE_PRUEBA = "Proyecto de prueba encargo 3";

afterAll(async () => {
  await db.project.deleteMany({ where: { nombre: { contains: "prueba encargo 3" } } });
  await db.$disconnect();
});

describe("anillo orbital y resumen (H1.4), con los datos del seed", () => {
  it("Yajoma cierra un tercio: 1 de 3 tareas de la semana completadas", async () => {
    const yajoma = await resumenDeProyecto(db, "yajoma");
    expect(yajoma?.resultadoComprometido).toBe(
      "Specs 015 y 016 aprobadas y la 015 implementada en development."
    );
    expect(yajoma?.tareasSemanaCompletadas).toBe(1);
    expect(yajoma?.tareasSemanaTotales).toBe(3);
    expect(yajoma?.avance).toBeCloseTo(1 / 3);
  });

  it("Cribo cierra la mitad", async () => {
    const cribo = await resumenDeProyecto(db, "cribo");
    expect(cribo?.avance).toBeCloseTo(1 / 2);
  });

  it("sin resultado comprometido el anillo queda abierto: avance null", async () => {
    const orbia = await resumenDeProyecto(db, "orbia");
    expect(orbia?.resultadoComprometido).toBeNull();
    expect(orbia?.avance).toBeNull();
  });
});

describe("crear proyecto con el cupo de R2 lleno (H1.1)", () => {
  it("valida los campos en el servidor", async () => {
    const sinObjetivo = await crearProyecto(db, {
      nombre: NOMBRE_PRUEBA,
      cliente: "",
      objetivo: "   ",
    });
    expect(sinObjetivo.ok).toBe(false);

    const objetivoLargo = await crearProyecto(db, {
      nombre: NOMBRE_PRUEBA,
      cliente: "",
      objetivo: "x".repeat(281),
    });
    expect(objetivoLargo.ok).toBe(false);
  });

  it("no da error: crea el proyecto en pausa y avisa", async () => {
    // El seed carga cinco proyectos activos, así que el cupo de 3 está
    // desbordado antes de empezar (DUDAS 4 del encargo 2).
    const resultado = await crearProyecto(db, {
      nombre: NOMBRE_PRUEBA,
      cliente: "Cliente de prueba",
      objetivo: "Comprobar que el cuarto proyecto nace en pausa.",
    });
    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.aviso).toContain("se ha creado en pausa");

    const creado = await db.project.findUnique({ where: { slug: resultado.slug } });
    expect(creado?.estado).toBe("pausado");
    // Con los cinco acentos del seed en uso, recibe el sexto de la paleta.
    expect(creado?.color_acento).toBe("#8A6A7B");
    expect(creado?.tipo).toBe("entrega");
  });

  it("el slug se genera del nombre y no colisiona", async () => {
    const repetido = await crearProyecto(db, {
      nombre: NOMBRE_PRUEBA,
      cliente: "",
      objetivo: "Comprobar la unicidad del slug.",
    });
    expect(repetido.ok).toBe(true);
    if (!repetido.ok) return;
    expect(repetido.slug).toBe("proyecto-de-prueba-encargo-3-2");
  });
});

describe("pausar, activar y archivar (H1.3)", () => {
  it("activar con el cupo lleno se rechaza en el servidor con el aviso", async () => {
    const resultado = await cambiarEstadoProyecto(db, "proyecto-de-prueba-encargo-3", "activo");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain("Pausa uno antes de activar otro.");
    const proyecto = await db.project.findUnique({
      where: { slug: "proyecto-de-prueba-encargo-3" },
    });
    expect(proyecto?.estado).toBe("pausado");
  });

  it("archivar lo saca de la lista principal y lo deja tras el filtro", async () => {
    const resultado = await cambiarEstadoProyecto(db, "proyecto-de-prueba-encargo-3", "archivado");
    expect(resultado.ok).toBe(true);

    const principales = await resumenDeProyectos(db);
    expect(principales.some((p) => p.slug === "proyecto-de-prueba-encargo-3")).toBe(false);

    const archivados = await resumenDeProyectos(db, { archivados: true });
    expect(archivados.some((p) => p.slug === "proyecto-de-prueba-encargo-3")).toBe(true);
  });

  it("recuperar de archivado a pausa conserva los datos", async () => {
    const resultado = await cambiarEstadoProyecto(db, "proyecto-de-prueba-encargo-3", "pausado");
    expect(resultado.ok).toBe(true);
    const proyecto = await db.project.findUnique({
      where: { slug: "proyecto-de-prueba-encargo-3" },
    });
    expect(proyecto?.objetivo).toBe("Comprobar que el cuarto proyecto nace en pausa.");
  });
});

describe("brief vivo: versionado por hash de contenido normalizado (H1.2)", () => {
  const slug = "proyecto-de-prueba-encargo-3";
  const v1 = `## Contexto
Un contexto de prueba.

## Objetivos
- Probar el versionado.

## Riesgos
Ninguno.`;

  it("la primera versión se crea con hash y secciones parseadas", async () => {
    const resultado = await guardarBrief(db, slug, v1);
    expect(resultado).toMatchObject({ ok: true, version: 1, sinCambios: false });
    const brief = await db.projectBrief.findFirst({
      where: { project: { slug } },
      orderBy: { version: "desc" },
    });
    expect(brief?.content_hash).toBe(hashContenido(v1));
    const secciones = brief?.secciones as Record<string, string>;
    expect(secciones.contexto).toBe("Un contexto de prueba.");
    expect(secciones.stack).toBe("");
  });

  it("un cambio solo de formato no crea versión: el hash se calcula normalizado", async () => {
    const conFormato = v1.replace(/\n/g, "\n").replace("## Objetivos", "## Objetivos  ") + "\n\n\n";
    const resultado = await guardarBrief(db, slug, conFormato);
    expect(resultado).toMatchObject({ ok: true, version: 1, sinCambios: true });
    expect(await db.projectBrief.count({ where: { project: { slug } } })).toBe(1);
  });

  it("un cambio real crea la versión siguiente", async () => {
    const v2 = v1.replace("Un contexto de prueba.", "Un contexto distinto.");
    const resultado = await guardarBrief(db, slug, v2);
    expect(resultado).toMatchObject({ ok: true, version: 2, sinCambios: false });
  });

  it("el aviso de derivación compara hashes, no números de versión", async () => {
    const proyecto = await db.project.findUnique({ where: { slug } });
    if (!proyecto) throw new Error("falta el proyecto de prueba");

    // Sin intents no hay aviso.
    expect(await briefCambioDesdeDerivacion(db, proyecto.id)).toBe(false);

    // Un intent derivado de la versión 1: el contenido actual (v2) difiere.
    const intent = await db.researchIntent.create({
      data: {
        user_id: "vluna",
        project_id: proyecto.id,
        pregunta: "Pregunta de prueba encargo 3",
        keywords: ["prueba"],
        justificacion: "Prueba del aviso de derivación.",
        derivado_de_brief_version: 1,
      },
    });
    expect(await briefCambioDesdeDerivacion(db, proyecto.id)).toBe(true);

    // Volver al contenido de la v1 crea la v3 con el mismo hash que la v1:
    // el aviso desaparece aunque el número de versión haya cambiado.
    const resultado = await guardarBrief(db, slug, v1);
    expect(resultado).toMatchObject({ ok: true, version: 3, sinCambios: false });
    expect(await briefCambioDesdeDerivacion(db, proyecto.id)).toBe(false);

    await db.researchIntent.delete({ where: { id: intent.id } });
  });
});
