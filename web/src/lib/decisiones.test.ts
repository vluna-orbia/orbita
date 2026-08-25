import { describe, expect, it } from "vitest";
import { diasAbierta, opcionesComoLista, validarCierre } from "./decisiones";

const ahora = new Date("2026-08-25T12:00:00+02:00");

describe("diasAbierta", () => {
  it("en una decisión abierta se calcula al leer, desde abierta_desde", () => {
    const decision = {
      estado: "abierta" as const,
      abierta_desde: new Date("2026-08-13T09:00:00+02:00"),
      cerrada_el: null,
      dias_abierta: 0, // la columna se ignora mientras está abierta
    };
    expect(diasAbierta(decision, ahora)).toBe(12);
  });

  it("en una decisión cerrada se derivan de cerrada_el, no de ahora", () => {
    const decision = {
      estado: "cerrada" as const,
      abierta_desde: new Date("2026-06-01T09:00:00+02:00"),
      cerrada_el: new Date("2026-06-21T09:00:00+02:00"),
      dias_abierta: 20,
    };
    expect(diasAbierta(decision, ahora)).toBe(20);
  });

  it("nunca devuelve días negativos", () => {
    const decision = {
      estado: "abierta" as const,
      abierta_desde: new Date("2026-08-26T09:00:00+02:00"),
      cerrada_el: null,
      dias_abierta: 0,
    };
    expect(diasAbierta(decision, ahora)).toBe(0);
  });
});

describe("opcionesComoLista", () => {
  it("acepta la lista JSON de textos de la base", () => {
    expect(opcionesComoLista(["Obrador", "Pastelería"])).toEqual(["Obrador", "Pastelería"]);
  });

  it("descarta lo que no sea texto y tolera JSON inesperado", () => {
    expect(opcionesComoLista(["a", 3, "", null, "b"])).toEqual(["a", "b"]);
    expect(opcionesComoLista({ opciones: [] })).toEqual([]);
    expect(opcionesComoLista(null)).toEqual([]);
  });
});

describe("validarCierre", () => {
  const opciones = ["Obrador", "Pastelería"];

  it("exige opción y motivo, y recorta espacios", () => {
    const resultado = validarCierre(opciones, " Obrador ", "  Emilio confirmó el criterio.  ");
    expect(resultado).toEqual({ ok: true, opcion: "Obrador", motivo: "Emilio confirmó el criterio." });
  });

  it("rechaza una opción que no está entre las consideradas", () => {
    const resultado = validarCierre(opciones, "Otra cosa", "motivo");
    expect(resultado.ok).toBe(false);
  });

  it("rechaza el cierre sin motivo: R6 lo registra", () => {
    const resultado = validarCierre(opciones, "Obrador", "   ");
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain("R6");
  });

  it("rechaza el cierre sin opción", () => {
    expect(validarCierre(opciones, "", "motivo").ok).toBe(false);
  });
});
