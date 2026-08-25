// Dominio de proyectos (H1.1, H1.3): paleta de acentos, slug y las reglas
// de validación que el servidor aplica sobre el límite de activos (R2).

// Paleta de seis tonos apagados derivados del crema y el coral (documento
// 01, regla 2 de color). Los cinco primeros son los asignados en el seed.
export const PALETA_ACENTOS = [
  "#B99C4A", // trigo
  "#5B6B73", // pizarra
  "#C97B5A", // coral apagado
  "#3D3A54", // tinta
  "#5F7A5B", // salvia
  "#8A6A7B", // malva
] as const;

// Color de acento asignado automáticamente: el primero de la paleta que
// no esté en uso; con todos en uso, el menos repetido en orden de paleta.
export function siguienteColorAcento(enUso: string[]): string {
  const normalizados = enUso.map((c) => c.toUpperCase());
  const libre = PALETA_ACENTOS.find((c) => !normalizados.includes(c));
  if (libre) return libre;
  let elegido: string = PALETA_ACENTOS[0];
  let menorCuenta = Infinity;
  for (const color of PALETA_ACENTOS) {
    const cuenta = normalizados.filter((c) => c === color).length;
    if (cuenta < menorCuenta) {
      menorCuenta = cuenta;
      elegido = color;
    }
  }
  return elegido;
}

// Slug legible a partir del nombre, sin acentos ni signos.
export function generarSlug(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || "proyecto";
}

export const OBJETIVO_MAXIMO = 280;

export type DatosProyecto = { nombre: string; cliente: string; objetivo: string };
export type ResultadoValidacion =
  | { ok: true; datos: { nombre: string; cliente: string | null; objetivo: string } }
  | { ok: false; error: string };

// Validación de los campos de H1.1: nombre obligatorio, cliente opcional,
// objetivo obligatorio de hasta 280 caracteres. Se aplica en el servidor.
export function validarDatosProyecto(datos: DatosProyecto): ResultadoValidacion {
  const nombre = datos.nombre.trim();
  const cliente = datos.cliente.trim();
  const objetivo = datos.objetivo.trim();
  if (!nombre) return { ok: false, error: "El proyecto necesita un nombre." };
  if (!objetivo) return { ok: false, error: "El objetivo es obligatorio. Una frase basta." };
  if (objetivo.length > OBJETIVO_MAXIMO) {
    return {
      ok: false,
      error: `El objetivo admite hasta ${OBJETIVO_MAXIMO} caracteres y lleva ${objetivo.length}.`,
    };
  }
  return { ok: true, datos: { nombre, cliente: cliente || null, objetivo } };
}

// Mensajes del límite de activos (R2), con la voz del sistema de diseño.
export function mensajeCreadoEnPausa(limite: number): string {
  return `Ya tienes ${limite} proyectos activos, el límite de la regla R2. El proyecto se ha creado en pausa.`;
}

export function mensajeLimiteAlActivar(limite: number): string {
  return `Ya tienes ${limite} proyectos activos. Pausa uno antes de activar otro.`;
}
