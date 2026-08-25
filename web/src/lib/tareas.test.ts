import { describe, expect, it } from "vitest";
import {
  ESTADOS_TAREA,
  esEstadoTarea,
  estaBloqueada,
  interpretarCaptura,
  mensajeLimiteWip,
  mensajeTransicionInvalida,
  puedeTransicionar,
  validarBloqueo,
  type EstadoTarea,
} from "./tareas";

describe("máquina de estados de tareas (H2.2)", () => {
  it("sigue el flujo inbox → backlog → semana → en_curso → hecha", () => {
    expect(puedeTransicionar("inbox", "backlog")).toBe(true);
    expect(puedeTransicionar("backlog", "semana")).toBe(true);
    expect(puedeTransicionar("semana", "en_curso")).toBe(true);
    expect(puedeTransicionar("en_curso", "hecha")).toBe(true);
  });

  it("solo se pasa a en_curso desde semana", () => {
    for (const desde of ESTADOS_TAREA) {
      expect(puedeTransicionar(desde, "en_curso")).toBe(desde === "semana");
    }
    expect(mensajeTransicionInvalida("inbox", "en_curso")).toContain("Semana");
  });

  it("descartada se alcanza desde cualquier estado no terminal", () => {
    for (const desde of ["inbox", "backlog", "semana", "en_curso"] as EstadoTarea[]) {
      expect(puedeTransicionar(desde, "descartada")).toBe(true);
    }
  });

  it("hecha y descartada son estados terminales", () => {
    for (const hacia of ESTADOS_TAREA) {
      expect(puedeTransicionar("hecha", hacia)).toBe(false);
      expect(puedeTransicionar("descartada", hacia)).toBe(false);
    }
  });

  it("en_curso puede volver a semana (H2.4) y semana al backlog", () => {
    expect(puedeTransicionar("en_curso", "semana")).toBe(true);
    expect(puedeTransicionar("semana", "backlog")).toBe(true);
  });

  it("no hay saltos hacia atrás en el resto del flujo", () => {
    expect(puedeTransicionar("backlog", "inbox")).toBe(false);
    expect(puedeTransicionar("semana", "inbox")).toBe(false);
    expect(puedeTransicionar("en_curso", "backlog")).toBe(false);
    expect(puedeTransicionar("inbox", "hecha")).toBe(false);
    expect(puedeTransicionar("backlog", "hecha")).toBe(false);
  });

  it("valida los nombres de estado que llegan de fuera", () => {
    expect(esEstadoTarea("semana")).toBe(true);
    expect(esEstadoTarea("terminada")).toBe(false);
  });

  it("el mensaje del límite de WIP es el de la historia, con el límite del playbook", () => {
    expect(mensajeLimiteWip(3)).toBe(
      "Ya tienes 3 tareas en curso. Cierra una antes de empezar otra."
    );
    expect(mensajeLimiteWip(2)).toContain("2 tareas en curso");
  });
});

describe("captura con proyecto en línea (H2.1)", () => {
  const proyectos = [
    { id: "p1", nombre: "Yajoma", slug: "yajoma" },
    { id: "p2", nombre: "Flujo de specs", slug: "flujo-specs" },
  ];

  it("sin arroba, crea sin proyecto con el texto tal cual", () => {
    const r = interpretarCaptura("Llamar a Siscom por el certificado", proyectos);
    expect(r).toEqual({ titulo: "Llamar a Siscom por el certificado", proyectoId: null });
  });

  it("con @nombre asigna el proyecto por prefijo y limpia el token del título", () => {
    const r = interpretarCaptura("Revisar la spec 017 @yajoma", proyectos);
    expect(r).toEqual({ titulo: "Revisar la spec 017", proyectoId: "p1" });
  });

  it("el prefijo vale contra el nombre, sin distinguir mayúsculas ni acentos", () => {
    const r = interpretarCaptura("Ordenar plantillas @Flujo", proyectos);
    expect(r).toEqual({ titulo: "Ordenar plantillas", proyectoId: "p2" });
  });

  it("una arroba que no casa con ningún proyecto queda como texto", () => {
    const r = interpretarCaptura("Escribir a @emilio por las recetas", proyectos);
    expect(r).toEqual({ titulo: "Escribir a @emilio por las recetas", proyectoId: null });
  });

  it("rechaza la captura vacía, también cuando solo queda la arroba", () => {
    expect("error" in interpretarCaptura("   ", proyectos)).toBe(true);
    expect("error" in interpretarCaptura("@yajoma", proyectos)).toBe(true);
  });
});

describe("bloqueos (H2.5)", () => {
  it("el bloqueo exige motivo", () => {
    expect(validarBloqueo("").ok).toBe(false);
    expect(validarBloqueo("  ").ok).toBe(false);
    const r = validarBloqueo(" Falta el visto bueno de Emilio ");
    expect(r).toEqual({ ok: true, motivo: "Falta el visto bueno de Emilio" });
  });

  it("una tarea está bloqueada cuando tiene motivo", () => {
    expect(estaBloqueada({ motivo_bloqueo: null })).toBe(false);
    expect(estaBloqueada({ motivo_bloqueo: "  " })).toBe(false);
    expect(estaBloqueada({ motivo_bloqueo: "Depende de Solvos" })).toBe(true);
  });
});
