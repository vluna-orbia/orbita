// Tests unitarios de las seis métricas de adherencia (H5.3): cada
// fórmula es una función y cada función tiene su test, con el rango de
// una semana civil de Madrid.

import { describe, expect, it } from "vitest";
import {
  metricaR1,
  metricaR2,
  metricaR3,
  metricaR4,
  metricaR5,
  metricaR6,
  porcentaje,
  porcentajeParaBarra,
} from "./adherencia";
import { rangoDeSemanaPura } from "./semana";

// Semana del lunes 17 al domingo 23 de agosto de 2026, en Madrid.
const LUNES = new Date(Date.UTC(2026, 7, 17));
const RANGO = rangoDeSemanaPura(LUNES);

function dia(diaDelMes: number, hora = 12): Date {
  return new Date(Date.UTC(2026, 7, diaDelMes, hora));
}

describe("metricaR1: intentos de superar el WIP / transiciones a en_curso", () => {
  it("cuenta rechazos y transiciones solo de la semana", () => {
    const rechazos = [{ creadoEl: dia(18) }, { creadoEl: dia(21) }, { creadoEl: dia(25) }];
    const transiciones = [
      { creadoEl: dia(17) },
      { creadoEl: dia(19) },
      { creadoEl: dia(20) },
      { creadoEl: dia(14) },
    ];
    expect(metricaR1(rechazos, transiciones, RANGO)).toEqual({ numerador: 2, denominador: 3 });
  });

  it("sin rechazos ni transiciones la semana queda sin dato", () => {
    expect(metricaR1([], [], RANGO)).toBeNull();
  });

  it("una semana sin intentos y con transiciones es 0 sobre n", () => {
    const transiciones = [{ creadoEl: dia(18) }];
    expect(metricaR1([], transiciones, RANGO)).toEqual({ numerador: 0, denominador: 1 });
  });
});

describe("metricaR2: semanas con `limite` o menos proyectos activos", () => {
  it("adhiere con activos igual o por debajo del límite del playbook", () => {
    expect(metricaR2(3, 3)).toEqual({ numerador: 1, denominador: 1 });
    expect(metricaR2(2, 3)).toEqual({ numerador: 1, denominador: 1 });
  });

  it("no adhiere por encima del límite, sea cual sea el límite", () => {
    expect(metricaR2(4, 3)).toEqual({ numerador: 0, denominador: 1 });
    // El límite viene de parametros.limite, no de un 3 en duro.
    expect(metricaR2(4, 5)).toEqual({ numerador: 1, denominador: 1 });
    expect(metricaR2(3, 2)).toEqual({ numerador: 0, denominador: 1 });
  });

  it("una semana sin planificación queda sin dato", () => {
    expect(metricaR2(null, 3)).toBeNull();
  });
});

describe("metricaR3: sesiones cerradas con nota / total de sesiones", () => {
  it("las abandonadas cuentan en el total y nunca como con nota", () => {
    const sesiones = [
      { empezadaEl: dia(17), estado: "cerrada" as const, conNota: true },
      { empezadaEl: dia(18), estado: "cerrada" as const, conNota: false },
      // Abandonada con la nota escrita después: sigue sin contar (H3.3).
      { empezadaEl: dia(19), estado: "abandonada" as const, conNota: true },
      { empezadaEl: dia(24), estado: "cerrada" as const, conNota: true },
    ];
    expect(metricaR3(sesiones, RANGO)).toEqual({ numerador: 1, denominador: 3 });
  });

  it("una semana sin sesiones queda sin dato", () => {
    expect(metricaR3([], RANGO)).toBeNull();
  });
});

describe("metricaR4: procesados en el ritual / capturados", () => {
  it("cuenta capturas de la semana y triajes hechos en el ritual", () => {
    const capturas = [{ creadoEl: dia(17) }, { creadoEl: dia(19) }, { creadoEl: dia(26) }];
    const triajes = [{ creadoEl: dia(17, 9) }];
    expect(metricaR4(capturas, triajes, RANGO)).toEqual({ numerador: 1, denominador: 2 });
  });

  it("el triaje del lunes puede procesar capturas de la semana anterior", () => {
    // Nada capturado esta semana, dos elementos arrastrados y procesados.
    const triajes = [{ creadoEl: dia(17, 9) }, { creadoEl: dia(17, 9) }];
    expect(metricaR4([], triajes, RANGO)).toEqual({ numerador: 2, denominador: 0 });
  });

  it("sin capturas ni triajes la semana queda sin dato", () => {
    expect(metricaR4([], [], RANGO)).toBeNull();
  });
});

describe("metricaR5: resultados cumplidos / comprometidos", () => {
  it("cuenta los cumplidos sobre todos los comprometidos", () => {
    const resultados = [{ cumplido: true }, { cumplido: false }, { cumplido: true }];
    expect(metricaR5(resultados, true)).toEqual({ numerador: 2, denominador: 3 });
  });

  it("sin retrospectiva no hay dato aunque haya resultados", () => {
    expect(metricaR5([{ cumplido: null }], false)).toBeNull();
  });

  it("sin resultados comprometidos no hay dato", () => {
    expect(metricaR5([], true)).toBeNull();
  });
});

describe("metricaR6: decisiones cerradas con motivo / cerradas", () => {
  it("cuenta solo las cerradas dentro de la semana", () => {
    const cerradas = [
      { cerradaEl: dia(18), conMotivo: true },
      { cerradaEl: dia(20), conMotivo: false },
      { cerradaEl: dia(26), conMotivo: true },
    ];
    expect(metricaR6(cerradas, RANGO)).toEqual({ numerador: 1, denominador: 2 });
  });

  it("una semana sin cierres queda sin dato", () => {
    expect(metricaR6([], RANGO)).toBeNull();
  });
});

describe("porcentaje y barra", () => {
  it("redondea el porcentaje y aguanta el denominador cero", () => {
    expect(porcentaje({ numerador: 1, denominador: 3 })).toBe(33);
    expect(porcentaje({ numerador: 2, denominador: 0 })).toBe(100);
    expect(porcentaje({ numerador: 0, denominador: 0 })).toBe(0);
  });

  it("la barra de R1 se pinta invertida: sin intentos es 100", () => {
    expect(porcentajeParaBarra("R1", { numerador: 0, denominador: 5 })).toBe(100);
    expect(porcentajeParaBarra("R1", { numerador: 5, denominador: 5 })).toBe(0);
    expect(porcentajeParaBarra("R3", { numerador: 5, denominador: 5 })).toBe(100);
  });
});
