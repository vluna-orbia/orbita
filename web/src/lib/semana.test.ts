import { describe, expect, it } from "vitest";
import {
  inicioDeSemana,
  instanteFinDeSemana,
  instanteInicioDeDia,
  instanteInicioDeSemana,
  rangoDeAyer,
} from "./semana";

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

describe("instanteInicioDeDia y rangoDeAyer", () => {
  it("la medianoche de un día de verano en Madrid son las 22:00 UTC de la víspera", () => {
    const martes = new Date("2026-08-25T12:00:00+02:00");
    expect(instanteInicioDeDia(martes).toISOString()).toBe("2026-08-24T22:00:00.000Z");
  });

  it("ayer es el día civil anterior en Madrid, no en UTC", () => {
    // 23:30 UTC del 24/08 ya es 01:30 del 25/08 en Madrid (UTC+2): ayer
    // en Madrid es el 24, aunque en UTC siga siendo el mismo día.
    const madrugada = new Date("2026-08-24T23:30:00Z");
    const { inicio, fin } = rangoDeAyer(madrugada);
    expect(inicio.toISOString()).toBe("2026-08-23T22:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-08-24T22:00:00.000Z");
  });

  it("el fin del rango es exclusivo: la medianoche de hoy ya no es ayer", () => {
    const martes = new Date("2026-08-25T09:00:00+02:00");
    const { inicio, fin } = rangoDeAyer(martes);
    expect(inicio.toISOString()).toBe("2026-08-23T22:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-08-24T22:00:00.000Z");
    // Una sesión cerrada justo a las 00:00 de hoy queda fuera por el
    // operador lt; una cerrada a las 23:59:59 de ayer queda dentro.
    expect(fin.getTime() - inicio.getTime()).toBe(24 * 3_600_000);
  });

  it("cruza el cambio de hora de marzo: ayer dura 23 horas", () => {
    // El 29/03/2026 Madrid pasa de UTC+1 a UTC+2.
    const lunes = new Date("2026-03-30T10:00:00+02:00");
    const { inicio, fin } = rangoDeAyer(lunes);
    expect(inicio.toISOString()).toBe("2026-03-28T23:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-03-29T22:00:00.000Z");
    expect((fin.getTime() - inicio.getTime()) / 3_600_000).toBe(23);
  });

  it("cruza el cambio de hora de octubre: ayer dura 25 horas", () => {
    // El 25/10/2026 Madrid pasa de UTC+2 a UTC+1.
    const lunes = new Date("2026-10-26T10:00:00+01:00");
    const { inicio, fin } = rangoDeAyer(lunes);
    expect(inicio.toISOString()).toBe("2026-10-24T22:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-10-25T23:00:00.000Z");
    expect((fin.getTime() - inicio.getTime()) / 3_600_000).toBe(25);
  });

  it("el primer día del mes retrocede al último del anterior", () => {
    const uno = new Date("2026-09-01T08:00:00+02:00");
    const { inicio, fin } = rangoDeAyer(uno);
    expect(inicio.toISOString()).toBe("2026-08-30T22:00:00.000Z");
    expect(fin.toISOString()).toBe("2026-08-31T22:00:00.000Z");
  });
});
