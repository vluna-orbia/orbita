// Decisiones (adenda 04). Interfaz del encargo 3.
//
// Resolución de la DUDA 2 del encargo 2 (dias_abierta, dato derivado con
// dos fuentes de verdad): mientras la decisión está abierta, los días se
// calculan al leer a partir de abierta_desde y la columna no se consulta;
// al cerrarla, el valor se congela en la columna como registro histórico
// (días entre abierta_desde y cerrada_el). Una sola fuente de verdad por
// estado, sin job de recálculo.

export function diasEntre(desde: Date, hasta: Date): number {
  return Math.max(0, Math.floor((hasta.getTime() - desde.getTime()) / 86_400_000));
}

export type DecisionParaDias = {
  estado: "abierta" | "cerrada" | "caducada";
  abierta_desde: Date;
  cerrada_el: Date | null;
  dias_abierta: number;
};

// Días que la decisión lleva (o estuvo) abierta, según su estado.
export function diasAbierta(decision: DecisionParaDias, ahora: Date = new Date()): number {
  if (decision.estado === "abierta") return diasEntre(decision.abierta_desde, ahora);
  if (decision.cerrada_el) return diasEntre(decision.abierta_desde, decision.cerrada_el);
  return decision.dias_abierta;
}

// Opciones consideradas, desde el JSON de la base a lista de textos.
export function opcionesComoLista(opciones: unknown): string[] {
  if (!Array.isArray(opciones)) return [];
  return opciones.filter((o): o is string => typeof o === "string" && o.trim() !== "");
}

export type ResultadoCierre =
  | { ok: true; opcion: string; motivo: string }
  | { ok: false; error: string };

// Validación del cierre (R6: la opción elegida y el motivo se registran).
// La opción tiene que ser una de las consideradas.
export function validarCierre(
  opciones: unknown,
  opcionElegida: string,
  motivo: string
): ResultadoCierre {
  const lista = opcionesComoLista(opciones);
  const opcion = opcionElegida.trim();
  const motivoLimpio = motivo.trim();
  if (!opcion) return { ok: false, error: "Elige la opción tomada." };
  if (!lista.includes(opcion)) {
    return { ok: false, error: "La opción elegida no está entre las consideradas." };
  }
  if (!motivoLimpio) {
    return { ok: false, error: "Escribe el motivo de la elección. La regla R6 lo registra." };
  }
  return { ok: true, opcion, motivo: motivoLimpio };
}

// ---------- Alta y edición (encargo 4b) ----------

export type DatosDecision = {
  titulo: string;
  opciones: string[];
  bloqueadoPor: string | null;
};

export type ResultadoDatosDecision =
  | { ok: true; datos: DatosDecision }
  | { ok: false; error: string };

// Validación del alta y la edición. R6 literal: una decisión tiene más de
// una opción viable; con una sola no hay decisión que registrar. Las
// opciones llegan una por línea; se recortan, se descartan las vacías y
// las repetidas se quedan con la primera aparición.
export function validarDatosDecision(entrada: {
  titulo: string;
  opciones: string;
  bloqueadoPor?: string;
}): ResultadoDatosDecision {
  const titulo = entrada.titulo.trim();
  if (!titulo) return { ok: false, error: "Escribe el título de la decisión." };
  if (titulo.length > 200) {
    return { ok: false, error: "El título no puede pasar de 200 caracteres." };
  }
  const opciones = [
    ...new Set(
      entrada.opciones
        .split("\n")
        .map((o) => o.trim())
        .filter((o) => o !== "")
    ),
  ];
  if (opciones.length < 2) {
    return {
      ok: false,
      error:
        "Una decisión necesita al menos dos opciones consideradas. Con una sola no hay decisión que registrar: es la regla R6.",
    };
  }
  const bloqueadoPor = (entrada.bloqueadoPor ?? "").trim();
  return {
    ok: true,
    datos: { titulo, opciones, bloqueadoPor: bloqueadoPor === "" ? null : bloqueadoPor },
  };
}
