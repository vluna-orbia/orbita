import { describe, expect, it } from "vitest";
import {
  cierreDelAnillo,
  compromisoSemanal,
  cuentaParaLimiteDeActivos,
  metricaDeRetrospectiva,
  pideResultadoComprometidoSemanal,
  tareasCuentanParaWip,
} from "./reglas-proyecto";

// Las cinco ramas de la tabla de la adenda 05, tipo a tipo.

describe("rama 1 · límite de 3 activos (R2)", () => {
  it("entrega cuenta para el límite", () => {
    expect(cuentaParaLimiteDeActivos("entrega")).toBe(true);
  });
  it("continuo no cuenta para el límite", () => {
    expect(cuentaParaLimiteDeActivos("continuo")).toBe(false);
  });
});

describe("rama 2 · resultado comprometido semanal (R5)", () => {
  it("entrega pide resultado comprometido", () => {
    expect(pideResultadoComprometidoSemanal("entrega")).toBe(true);
    expect(compromisoSemanal("entrega")).toBe("resultado_comprometido");
  });
  it("continuo trabaja con objetivo de horas", () => {
    expect(pideResultadoComprometidoSemanal("continuo")).toBe(false);
    expect(compromisoSemanal("continuo")).toBe("objetivo_de_horas");
  });
});

describe("rama 3 · las tareas cuentan para el WIP (R1)", () => {
  it("en ambos tipos", () => {
    expect(tareasCuentanParaWip("entrega")).toBe(true);
    expect(tareasCuentanParaWip("continuo")).toBe(true);
  });
});

describe("rama 4 · métrica en la retrospectiva", () => {
  it("entrega mide resultado cumplido, sí o no", () => {
    expect(metricaDeRetrospectiva("entrega")).toBe("resultado_cumplido");
  });
  it("continuo mide horas acumuladas frente a previsto", () => {
    expect(metricaDeRetrospectiva("continuo")).toBe("horas_frente_a_previsto");
  });
});

describe("rama 5 · cierre del anillo orbital", () => {
  it("entrega: tareas de la semana completadas sobre totales", () => {
    expect(
      cierreDelAnillo({ tipo: "entrega", tareasSemanaCompletadas: 3, tareasSemanaTotales: 4 })
    ).toBeCloseTo(0.75);
  });
  it("entrega sin tareas de semana: anillo abierto (null)", () => {
    expect(cierreDelAnillo({ tipo: "entrega", tareasSemanaTotales: 0 })).toBeNull();
    expect(cierreDelAnillo({ tipo: "entrega" })).toBeNull();
  });
  it("continuo: horas acumuladas sobre objetivo total", () => {
    expect(
      cierreDelAnillo({ tipo: "continuo", horasAcumuladas: 20, horasObjetivo: 80 })
    ).toBeCloseTo(0.25);
  });
  it("continuo sin horas objetivo: anillo abierto (null)", () => {
    expect(cierreDelAnillo({ tipo: "continuo", horasAcumuladas: 10 })).toBeNull();
    expect(cierreDelAnillo({ tipo: "continuo", horasAcumuladas: 10, horasObjetivo: null })).toBeNull();
  });
  it("el cierre se acota entre 0 y 1", () => {
    expect(
      cierreDelAnillo({ tipo: "entrega", tareasSemanaCompletadas: 9, tareasSemanaTotales: 4 })
    ).toBe(1);
    expect(
      cierreDelAnillo({ tipo: "continuo", horasAcumuladas: 200, horasObjetivo: 80 })
    ).toBe(1);
  });
});
