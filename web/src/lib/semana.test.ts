import { describe, expect, it } from "vitest";
import { inicioDeSemana, instanteFinDeSemana, instanteInicioDeSemana } from "./semana";

describe("inicioDeSemana", () => {
  it("devuelve el lunes de la semana en Europe/Madrid como fecha pura", () => {
    // Martes 25/08/2026 a mediodía en Madrid.
    const martes = new Date("2026-08-25T12:00:00+02:00");
    expect(inicioDeSemana(martes).toISOString()).toBe("2026-08-24T00:00:00.000Z");
  });

  it("un lunes pertenece a su propia semana", () => {
    const lunes = new Date("2026-08-24T00:30:00+02:00");
    expect(inicioDeSemana(lunes).toISOString()).toBe("2026-08-24T00:00:00.000Z");
  });

  it("el domingo de madrugada UTC sigue siendo domingo en Madrid en verano", () => {
    // 22:30 UTC del sábado = 00:30 del domingo en Madrid (UTC+2).
    const instante = new Date("2026-08-22T22:30:00Z");
    expect(inicioDeSemana(instante).toISOString()).toBe("2026-08-17T00:00:00.000Z");
  });

  it("funciona igual en invierno (UTC+1)", () => {
    // 23:30 UTC del domingo 25/01/2026 = 00:30 del lunes 26 en Madrid.
    const instante = new Date("2026-01-25T23:30:00Z");
    expect(inicioDeSemana(instante).toISOString()).toBe("2026-01-26T00:00:00.000Z");
  });
});

describe("instanteInicioDeSemana e instanteFinDeSemana", () => {
  it("la semana de verano empieza el lunes a las 00:00 de Madrid (22:00 UTC)", () => {
    const martes = new Date("2026-08-25T12:00:00+02:00");
    expect(instanteInicioDeSemana(martes).toISOString()).toBe("2026-08-23T22:00:00.000Z");
    expect(instanteFinDeSemana(martes).toISOString()).toBe("2026-08-30T22:00:00.000Z");
  });

  it("la semana de invierno empieza a las 23:00 UTC del domingo", () => {
    const miercoles = new Date("2026-01-28T10:00:00+01:00");
    expect(instanteInicioDeSemana(miercoles).toISOString()).toBe("2026-01-25T23:00:00.000Z");
  });

  it("la semana del cambio de hora de octubre dura una hora más", () => {
    // El 25/10/2026 Madrid pasa de UTC+2 a UTC+1.
    const instante = new Date("2026-10-21T12:00:00+02:00");
    const inicio = instanteInicioDeSemana(instante);
    const fin = instanteFinDeSemana(instante);
    expect(inicio.toISOString()).toBe("2026-10-18T22:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect((fin.getTime() - inicio.getTime()) / 3_600_000).toBe(169);
  });
});
