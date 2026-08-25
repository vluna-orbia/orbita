import { describe, expect, it } from "vitest";
import {
  duracionMinutos,
  esHuerfana,
  formatoCronometro,
  formatoMinutos,
  ultimaActividad,
  validarArranque,
  validarNotaDeCierre,
} from "./sesiones";

const T0 = new Date("2026-08-25T09:00:00+02:00");
const horas = (n: number) => new Date(T0.getTime() + n * 3_600_000);

describe("duración calculada en el servidor", () => {
  it("cuenta minutos entre started_at y el fin, redondeando", () => {
    expect(duracionMinutos(T0, horas(1))).toBe(60);
    expect(duracionMinutos(T0, new Date(T0.getTime() + 90_500))).toBe(2);
  });

  it("nunca es negativa aunque los relojes vengan torcidos", () => {
    expect(duracionMinutos(horas(2), T0)).toBe(0);
  });
});

describe("sesión huérfana (H3.3)", () => {
  it("una activa con más de 4 horas sin actividad es huérfana", () => {
    const sesion = { estado: "activa", started_at: T0, updated_at: T0 };
    expect(esHuerfana(sesion, horas(4))).toBe(false);
    expect(esHuerfana(sesion, new Date(horas(4).getTime() + 60_000))).toBe(true);
  });

  it("el latido del cronómetro cuenta como última actividad", () => {
    const sesion = { estado: "activa", started_at: T0, updated_at: horas(3) };
    expect(ultimaActividad(sesion)).toEqual(horas(3));
    expect(esHuerfana(sesion, horas(6))).toBe(false);
    expect(esHuerfana(sesion, horas(8))).toBe(true);
  });

  it("las cerradas y abandonadas no vuelven a marcarse", () => {
    expect(esHuerfana({ estado: "cerrada", started_at: T0, updated_at: T0 }, horas(9))).toBe(false);
    expect(esHuerfana({ estado: "abandonada", started_at: T0, updated_at: T0 }, horas(9))).toBe(
      false
    );
  });
});

describe("arranque con intención declarada (H3.1)", () => {
  it("la intención es obligatoria", () => {
    expect(validarArranque({ intencion: "  " }).ok).toBe(false);
    const r = validarArranque({ intencion: " Avanzar el endpoint de facturas " });
    expect(r).toEqual({ ok: true, intencion: "Avanzar el endpoint de facturas" });
  });
});

describe("nota de cierre (H3.2)", () => {
  const nota = { avance: "Endpoint hecho", bloqueo: "", siguientePaso: "Probarlo con datos reales" };

  it("pide el avance siempre", () => {
    expect(validarNotaDeCierre({ ...nota, avance: " " }, false).ok).toBe(false);
  });

  it("con R3 activa, el siguiente paso es obligatorio", () => {
    const r = validarNotaDeCierre({ ...nota, siguientePaso: "" }, true);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("R3");
  });

  it("con R3 desactivada, se puede cerrar sin siguiente paso", () => {
    const r = validarNotaDeCierre({ ...nota, siguientePaso: "" }, false);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.nota.siguientePaso).toBeNull();
  });

  it("el bloqueo es opcional y se limpia a null", () => {
    const r = validarNotaDeCierre(nota, true);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.nota).toEqual({
        avance: "Endpoint hecho",
        bloqueo: null,
        siguientePaso: "Probarlo con datos reales",
      });
    }
  });
});

describe("formato del cronómetro", () => {
  it("minutos y segundos hasta la hora, horas a partir de ahí", () => {
    expect(formatoCronometro(0)).toBe("0:00");
    expect(formatoCronometro(75)).toBe("1:15");
    expect(formatoCronometro(1934)).toBe("32:14");
    expect(formatoCronometro(5534)).toBe("1:32:14");
  });

  it("minutos legibles para el historial", () => {
    expect(formatoMinutos(45)).toBe("45 min");
    expect(formatoMinutos(60)).toBe("1 h");
    expect(formatoMinutos(92)).toBe("1 h 32 min");
  });
});
