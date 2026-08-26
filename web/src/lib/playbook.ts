// Dominio del Playbook (H5.1, H5.2): validación de reglas, claves de las
// reglas propias y el diff entre versiones para el historial. Funciones
// puras; el versionado y la persistencia viven en servicio-playbook.

export const CATEGORIAS_REGLA = ["foco", "captura", "ejecución", "revisión"] as const;
export type CategoriaRegla = (typeof CATEGORIAS_REGLA)[number];

export const CLAVES_BASE = ["R1", "R2", "R3", "R4", "R5", "R6"] as const;

export function esCategoriaRegla(valor: string): valor is CategoriaRegla {
  return (CATEGORIAS_REGLA as readonly string[]).includes(valor);
}

export function esReglaBase(clave: string): boolean {
  return (CLAVES_BASE as readonly string[]).includes(clave);
}

// Clave de la siguiente regla propia: R7, R8... a partir de la mayor
// existente, incluidas las retiradas (una clave no se reutiliza).
export function claveSiguiente(claves: string[]): string {
  let mayor = 6;
  for (const clave of claves) {
    const numero = /^R(\d+)$/.exec(clave);
    if (numero) mayor = Math.max(mayor, Number(numero[1]));
  }
  return `R${mayor + 1}`;
}

export type ResultadoRegla =
  | { ok: true; texto: string; categoria: CategoriaRegla }
  | { ok: false; error: string };

// Validación de una regla (alta de propia o edición de texto): texto
// obligatorio y categoría de las cuatro del sistema.
export function validarRegla(texto: string, categoria: string): ResultadoRegla {
  const limpio = texto.trim();
  if (!limpio) return { ok: false, error: "La regla necesita un texto. Una frase basta." };
  if (!esCategoriaRegla(categoria)) {
    return { ok: false, error: "La categoría tiene que ser foco, captura, ejecución o revisión." };
  }
  return { ok: true, texto: limpio, categoria };
}

export type ResultadoParametros =
  | { ok: true; parametros: Record<string, number> | null }
  | { ok: false; error: string };

// Parámetros editables de las reglas con validación: limite en R1 y R2,
// dias_umbral en R6. Enteros positivos; el resto de reglas no llevan.
export function validarParametros(clave: string, valor: string): ResultadoParametros {
  const campo = clave === "R6" ? "dias_umbral" : clave === "R1" || clave === "R2" ? "limite" : null;
  if (!campo) {
    if (valor.trim() !== "") {
      return { ok: false, error: "Esta regla no lleva parámetros." };
    }
    return { ok: true, parametros: null };
  }
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1) {
    return {
      ok: false,
      error:
        campo === "limite"
          ? "El límite es un número entero de 1 o más."
          : "El umbral son días enteros, 1 o más.",
    };
  }
  return { ok: true, parametros: { [campo]: numero } };
}

// ---------- Diff entre versiones (H5.2: qué cambió en cada versión) ----------

export type ReglaComparable = {
  clave: string;
  texto: string;
  categoria: string;
  activa: boolean;
  parametros: unknown;
  retirada: boolean;
};

// Describe en frases qué cambió de una versión a la siguiente. Compara
// por clave: altas, retiradas y cambios de texto, categoría, estado o
// parámetros.
export function diffDeVersiones(
  anterior: ReglaComparable[],
  nueva: ReglaComparable[]
): string[] {
  const cambios: string[] = [];
  const previas = new Map(anterior.map((r) => [r.clave, r]));
  for (const regla of nueva) {
    const previa = previas.get(regla.clave);
    if (!previa) {
      cambios.push(`${regla.clave} añadida: ${regla.texto}`);
      continue;
    }
    if (!previa.retirada && regla.retirada) cambios.push(`${regla.clave} retirada`);
    if (previa.texto !== regla.texto) cambios.push(`${regla.clave} reescrita`);
    if (previa.categoria !== regla.categoria) {
      cambios.push(`${regla.clave} pasa a la categoría ${regla.categoria}`);
    }
    if (previa.activa !== regla.activa) {
      cambios.push(`${regla.clave} ${regla.activa ? "activada" : "desactivada"}`);
    }
    if (JSON.stringify(previa.parametros ?? null) !== JSON.stringify(regla.parametros ?? null)) {
      cambios.push(`${regla.clave} cambia sus parámetros a ${JSON.stringify(regla.parametros)}`);
    }
  }
  for (const previa of anterior) {
    if (!nueva.some((r) => r.clave === previa.clave)) {
      cambios.push(`${previa.clave} eliminada`);
    }
  }
  return cambios;
}
