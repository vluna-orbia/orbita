import { describe, expect, it } from "vitest";
import {
  PALETA_ACENTOS,
  generarSlug,
  mensajeCreadoEnPausa,
  mensajeLimiteAlActivar,
  siguienteColorAcento,
  validarDatosProyecto,
} from "./proyectos";

describe("siguienteColorAcento", () => {
  it("asigna el primer color libre de la paleta", () => {
    expect(siguienteColorAcento([])).toBe(PALETA_ACENTOS[0]);
    expect(siguienteColorAcento([PALETA_ACENTOS[0], PALETA_ACENTOS[1]])).toBe(PALETA_ACENTOS[2]);
  });

  it("con los cinco colores del seed en uso asigna el sexto", () => {
    const seed = ["#B99C4A", "#5B6B73", "#C97B5A", "#3D3A54", "#5F7A5B"];
    expect(siguienteColorAcento(seed)).toBe("#8A6A7B");
  });

  it("con toda la paleta en uso reparte al menos repetido", () => {
    const enUso = [...PALETA_ACENTOS, PALETA_ACENTOS[0]];
    expect(siguienteColorAcento(enUso)).toBe(PALETA_ACENTOS[1]);
  });

  it("no distingue mayúsculas de minúsculas en los colores en uso", () => {
    expect(siguienteColorAcento(["#b99c4a"])).toBe(PALETA_ACENTOS[1]);
  });
});

describe("generarSlug", () => {
  it("quita acentos y signos", () => {
    expect(generarSlug("Órbita")).toBe("orbita");
    expect(generarSlug("Flujo de specs")).toBe("flujo-de-specs");
    expect(generarSlug("  Panadería  Yajoma  ")).toBe("panaderia-yajoma");
  });

  it("nunca devuelve vacío", () => {
    expect(generarSlug("¿?¡!")).toBe("proyecto");
  });
});

describe("validarDatosProyecto", () => {
  it("exige nombre y objetivo; el cliente es opcional", () => {
    const resultado = validarDatosProyecto({ nombre: "Nuevo", cliente: "", objetivo: "Un objetivo." });
    expect(resultado).toEqual({
      ok: true,
      datos: { nombre: "Nuevo", cliente: null, objetivo: "Un objetivo." },
    });
  });

  it("rechaza el objetivo vacío", () => {
    expect(validarDatosProyecto({ nombre: "Nuevo", cliente: "", objetivo: "  " }).ok).toBe(false);
  });

  it("rechaza el objetivo de más de 280 caracteres y dice cuántos lleva", () => {
    const resultado = validarDatosProyecto({
      nombre: "Nuevo",
      cliente: "",
      objetivo: "x".repeat(281),
    });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain("281");
  });

  it("admite exactamente 280 caracteres", () => {
    expect(
      validarDatosProyecto({ nombre: "Nuevo", cliente: "", objetivo: "x".repeat(280) }).ok
    ).toBe(true);
  });
});

describe("mensajes del límite de activos", () => {
  it("hablan en la voz del sistema: qué pasó y qué hacer, sin exclamaciones", () => {
    expect(mensajeCreadoEnPausa(3)).toContain("se ha creado en pausa");
    expect(mensajeLimiteAlActivar(3)).toContain("Pausa uno antes de activar otro.");
    expect(mensajeCreadoEnPausa(3)).not.toContain("!");
    expect(mensajeLimiteAlActivar(3)).not.toContain("!");
  });
});
