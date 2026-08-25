import { describe, expect, it } from "vitest";
import { hashContenido, normalizarContenido, parsearSecciones } from "./brief";

describe("normalización del contenido", () => {
  it("un cambio de formato no cambia el hash", () => {
    const a = "## Contexto\nTexto de prueba.\n\n## Riesgos\nUno.";
    const b = "## Contexto   \r\nTexto de prueba.\n\n\n\n## Riesgos\nUno.\n\n";
    expect(hashContenido(a)).toBe(hashContenido(b));
  });
  it("un cambio de contenido sí cambia el hash", () => {
    const a = "## Contexto\nTexto de prueba.";
    const b = "## Contexto\nTexto distinto.";
    expect(hashContenido(a)).not.toBe(hashContenido(b));
  });
  it("colapsa saltos redundantes y espacios finales", () => {
    expect(normalizarContenido("a  \n\n\n\nb\r\n")).toBe("a\n\nb");
  });
});

describe("parseo de las seis secciones", () => {
  it("reparte el contenido en sus claves", () => {
    const md = [
      "## Contexto",
      "Contexto del proyecto.",
      "## Objetivos",
      "Objetivo uno.",
      "## Requerimientos",
      "- Req uno",
      "## Stack",
      "Postgres.",
      "## Decisiones abiertas",
      "- Decisión uno",
      "## Riesgos",
      "- Riesgo uno",
    ].join("\n");
    const s = parsearSecciones(md);
    expect(s.contexto).toBe("Contexto del proyecto.");
    expect(s.objetivos).toBe("Objetivo uno.");
    expect(s.requerimientos).toBe("- Req uno");
    expect(s.stack).toBe("Postgres.");
    expect(s.decisiones_abiertas).toBe("- Decisión uno");
    expect(s.riesgos).toBe("- Riesgo uno");
  });
  it("tolera que falte una sección y que cambie el nivel de encabezado", () => {
    const s = parsearSecciones("# Contexto\nHola.\n### Riesgos\n- Uno");
    expect(s.contexto).toBe("Hola.");
    expect(s.riesgos).toBe("- Uno");
    expect(s.stack).toBe("");
    expect(s.decisiones_abiertas).toBe("");
  });
  it("ignora encabezados que no son secciones fijas", () => {
    const s = parsearSecciones("## Contexto\nUno.\n## Anexo\nFuera.\n## Riesgos\nDos.");
    expect(s.contexto).toContain("Uno.");
    expect(s.contexto).toContain("Fuera.");
    expect(s.riesgos).toBe("Dos.");
  });
});
