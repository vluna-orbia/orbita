// Tests del dominio del Playbook: claves de reglas propias, validación
// y el diff entre versiones del historial (H5.1, H5.2).

import { describe, expect, it } from "vitest";
import {
  claveSiguiente,
  diffDeVersiones,
  validarParametros,
  validarRegla,
  type ReglaComparable,
} from "./playbook";

describe("claveSiguiente", () => {
  it("sigue a la mayor clave existente, retiradas incluidas", () => {
    expect(claveSiguiente(["R1", "R2", "R3", "R4", "R5", "R6"])).toBe("R7");
    expect(claveSiguiente(["R1", "R6", "R9"])).toBe("R10");
    expect(claveSiguiente([])).toBe("R7");
  });
});

describe("validarRegla", () => {
  it("exige texto y una categoría del sistema", () => {
    expect(validarRegla("  ", "foco").ok).toBe(false);
    expect(validarRegla("Una regla nueva", "otra").ok).toBe(false);
    const valida = validarRegla("  Revisar el inbox a diario  ", "captura");
    expect(valida).toEqual({ ok: true, texto: "Revisar el inbox a diario", categoria: "captura" });
  });
});

describe("validarParametros", () => {
  it("limite entero positivo en R1 y R2, dias_umbral en R6", () => {
    expect(validarParametros("R1", "4")).toEqual({ ok: true, parametros: { limite: 4 } });
    expect(validarParametros("R2", "0").ok).toBe(false);
    expect(validarParametros("R6", "14")).toEqual({ ok: true, parametros: { dias_umbral: 14 } });
    expect(validarParametros("R6", "catorce").ok).toBe(false);
  });

  it("el resto de reglas no llevan parámetros", () => {
    expect(validarParametros("R3", "")).toEqual({ ok: true, parametros: null });
    expect(validarParametros("R3", "5").ok).toBe(false);
  });
});

describe("diffDeVersiones", () => {
  const base: ReglaComparable = {
    clave: "R1",
    texto: "Máximo 3 tareas en curso.",
    categoria: "foco",
    activa: true,
    parametros: { limite: 3 },
    retirada: false,
  };

  it("describe altas, desactivaciones, retiradas y cambios de parámetros", () => {
    const anterior = [base];
    const nueva: ReglaComparable[] = [
      { ...base, activa: false, parametros: { limite: 4 } },
      {
        clave: "R7",
        texto: "Los viernes sin reuniones.",
        categoria: "foco",
        activa: true,
        parametros: null,
        retirada: false,
      },
    ];
    const cambios = diffDeVersiones(anterior, nueva);
    expect(cambios).toContain("R1 desactivada");
    expect(cambios).toContain('R1 cambia sus parámetros a {"limite":4}');
    expect(cambios).toContain("R7 añadida: Los viernes sin reuniones.");
  });

  it("marca la retirada una sola vez y sin cambios devuelve vacío", () => {
    expect(diffDeVersiones([base], [base])).toEqual([]);
    const retirada = diffDeVersiones([base], [{ ...base, retirada: true }]);
    expect(retirada).toEqual(["R1 retirada"]);
  });
});
