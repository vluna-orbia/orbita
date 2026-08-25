// Utilidades del Brief Vivo: normalización, hash de contenido y parseo
// de las seis secciones fijas. Las usan el seed y, a partir del encargo 3,
// el editor de briefs.

import { createHash } from "node:crypto";

// Normaliza el markdown antes de calcular el hash: sin retornos de carro,
// sin espacios al final de línea y sin saltos redundantes. Un cambio de
// formato no debe disparar la regeneración de intents.
export function normalizarContenido(md: string): string {
  return md
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function hashContenido(md: string): string {
  return createHash("sha256").update(normalizarContenido(md), "utf8").digest("hex");
}

const CLAVES_SECCION: Record<string, string> = {
  contexto: "contexto",
  objetivos: "objetivos",
  requerimientos: "requerimientos",
  stack: "stack",
  "decisiones abiertas": "decisiones_abiertas",
  riesgos: "riesgos",
};

export type SeccionesBrief = {
  contexto: string;
  objetivos: string;
  requerimientos: string;
  stack: string;
  decisiones_abiertas: string;
  riesgos: string;
};

// Parsea el brief markdown a las seis secciones fijas. Tolera que falte
// una sección o que cambie el nivel de encabezado; lo ausente queda como
// cadena vacía.
export function parsearSecciones(md: string): SeccionesBrief {
  const secciones: SeccionesBrief = {
    contexto: "",
    objetivos: "",
    requerimientos: "",
    stack: "",
    decisiones_abiertas: "",
    riesgos: "",
  };
  let claveActual: keyof SeccionesBrief | null = null;
  const lineas = normalizarContenido(md).split("\n");
  const buffer: string[] = [];
  const volcar = () => {
    if (claveActual) secciones[claveActual] = buffer.join("\n").trim();
    buffer.length = 0;
  };
  for (const linea of lineas) {
    const m = linea.match(/^#{1,6}\s+(.+)$/);
    if (m) {
      const titulo = m[1].trim().toLowerCase();
      const clave = CLAVES_SECCION[titulo];
      if (clave) {
        volcar();
        claveActual = clave as keyof SeccionesBrief;
        continue;
      }
    }
    if (claveActual) buffer.push(linea);
  }
  volcar();
  return secciones;
}
