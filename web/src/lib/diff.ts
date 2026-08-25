// Comparación de dos versiones del brief, línea a línea (H1.2). Diff por
// subsecuencia común más larga: suficiente para textos de brief y sin
// dependencias.

export type LineaDiff = { tipo: "igual" | "anadida" | "eliminada"; texto: string };

export function diffLineas(a: string, b: string): LineaDiff[] {
  const lineasA = a.replace(/\r/g, "").split("\n");
  const lineasB = b.replace(/\r/g, "").split("\n");
  const n = lineasA.length;
  const m = lineasB.length;

  // Tabla LCS. Los briefs rondan las 150 líneas: n*m es asumible.
  const tabla: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      tabla[i][j] =
        lineasA[i] === lineasB[j]
          ? tabla[i + 1][j + 1] + 1
          : Math.max(tabla[i + 1][j], tabla[i][j + 1]);
    }
  }

  const resultado: LineaDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (lineasA[i] === lineasB[j]) {
      resultado.push({ tipo: "igual", texto: lineasA[i] });
      i++;
      j++;
    } else if (tabla[i + 1][j] >= tabla[i][j + 1]) {
      resultado.push({ tipo: "eliminada", texto: lineasA[i] });
      i++;
    } else {
      resultado.push({ tipo: "anadida", texto: lineasB[j] });
      j++;
    }
  }
  while (i < n) resultado.push({ tipo: "eliminada", texto: lineasA[i++] });
  while (j < m) resultado.push({ tipo: "anadida", texto: lineasB[j++] });
  return resultado;
}
