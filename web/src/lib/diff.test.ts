import { describe, expect, it } from "vitest";
import { diffLineas } from "./diff";

describe("diffLineas", () => {
  it("marca iguales, añadidas y eliminadas", () => {
    const a = "uno\ndos\ntres";
    const b = "uno\ndos y medio\ntres\ncuatro";
    const resultado = diffLineas(a, b);
    expect(resultado).toEqual([
      { tipo: "igual", texto: "uno" },
      { tipo: "eliminada", texto: "dos" },
      { tipo: "anadida", texto: "dos y medio" },
      { tipo: "igual", texto: "tres" },
      { tipo: "anadida", texto: "cuatro" },
    ]);
  });

  it("dos textos iguales no producen cambios", () => {
    const resultado = diffLineas("a\nb", "a\nb");
    expect(resultado.every((l) => l.tipo === "igual")).toBe(true);
  });

  it("tolera retornos de carro", () => {
    const resultado = diffLineas("a\r\nb", "a\nb");
    expect(resultado.every((l) => l.tipo === "igual")).toBe(true);
  });

  it("un texto vacío contra otro produce solo añadidas", () => {
    const resultado = diffLineas("", "a\nb");
    // La línea vacía original se elimina y las nuevas se añaden.
    expect(resultado.filter((l) => l.tipo === "anadida").map((l) => l.texto)).toEqual(["a", "b"]);
  });
});
