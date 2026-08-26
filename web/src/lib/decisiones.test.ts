import { describe, expect, it } from "vitest";
import { diasAbierta, opcionesComoLista, validarCierre, validarDatosDecision } from "./decisiones";

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

describe("validarDatosDecision (encargo 4b)", () => {
  it("recorta el título y exige que exista", () => {
    const vacio = validarDatosDecision({ titulo: "   ", opciones: "A\nB" });
    expect(vacio.ok).toBe(false);
    const valido = validarDatosDecision({ titulo: "  Elegir dominio  ", opciones: "A\nB" });
    expect(valido.ok).toBe(true);
    if (valido.ok) expect(valido.datos.titulo).toBe("Elegir dominio");
  });

  it("rechaza títulos de más de 200 caracteres", () => {
    const largo = validarDatosDecision({ titulo: "x".repeat(201), opciones: "A\nB" });
    expect(largo.ok).toBe(false);
  });

  it("limpia las opciones: recorta, quita vacías y deduplica conservando el orden", () => {
    const resultado = validarDatosDecision({
      titulo: "Opciones sucias",
      opciones: "  cribo.es \n\ncribo.app\ncribo.es\n   \n",
    });
    expect(resultado.ok).toBe(true);
    if (resultado.ok) expect(resultado.datos.opciones).toEqual(["cribo.es", "cribo.app"]);
  });

  it("con menos de dos opciones no hay decisión (R6)", () => {
    const una = validarDatosDecision({ titulo: "Coja", opciones: "única\n única " });
    expect(una.ok).toBe(false);
    if (!una.ok) expect(una.error).toContain("dos opciones");
    const ninguna = validarDatosDecision({ titulo: "Vacía", opciones: "\n\n" });
    expect(ninguna.ok).toBe(false);
  });

  it("quién bloquea es opcional y el vacío queda como nulo", () => {
    const sin = validarDatosDecision({ titulo: "Libre", opciones: "A\nB", bloqueadoPor: "   " });
    expect(sin.ok).toBe(true);
    if (sin.ok) expect(sin.datos.bloqueadoPor).toBeNull();
    const con = validarDatosDecision({ titulo: "Bloqueada", opciones: "A\nB", bloqueadoPor: " Solvos " });
    expect(con.ok).toBe(true);
    if (con.ok) expect(con.datos.bloqueadoPor).toBe("Solvos");
  });
});
