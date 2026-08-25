// Dominio de sesiones de trabajo (H3.1 a H3.4): validación del arranque
// y del cierre, duración calculada en el servidor desde started_at, y la
// detección de sesiones huérfanas. Funciones puras; la persistencia vive
// en servicio-sesiones.

// Una sesión activa sin actividad conocida durante más de 4 horas se
// considera huérfana (H3.3).
export const HORAS_HUERFANA = 4;

// Duración en minutos entre dos instantes, redondeada al minuto más
// cercano y nunca negativa. El cronómetro y el cierre se calculan siempre
// desde started_at en el servidor: el cliente solo pinta.
export function duracionMinutos(inicio: Date, fin: Date): number {
  return Math.max(0, Math.round((fin.getTime() - inicio.getTime()) / 60_000));
}

// La última actividad conocida de una sesión es el último latido que el
// cronómetro envió al servidor (updated_at), nunca anterior al arranque.
export function ultimaActividad(sesion: { started_at: Date; updated_at: Date }): Date {
  return sesion.updated_at.getTime() > sesion.started_at.getTime()
    ? sesion.updated_at
    : sesion.started_at;
}

export function esHuerfana(
  sesion: { estado: string; started_at: Date; updated_at: Date },
  ahora: Date = new Date()
): boolean {
  if (sesion.estado !== "activa") return false;
  const limite = HORAS_HUERFANA * 3_600_000;
  return ahora.getTime() - ultimaActividad(sesion).getTime() > limite;
}

// ---------- Arranque (H3.1) ----------

export type DatosArranque = { intencion: string };
export type ResultadoArranque =
  | { ok: true; intencion: string }
  | { ok: false; error: string };

export function validarArranque(datos: DatosArranque): ResultadoArranque {
  const intencion = datos.intencion.trim();
  if (!intencion) {
    return {
      ok: false,
      error: "Declara la intención en una frase: qué vas a avanzar en esta sesión.",
    };
  }
  return { ok: true, intencion };
}

export const MENSAJE_SESION_ACTIVA =
  "Ya hay una sesión en curso. Ciérrala antes de empezar otra.";

// ---------- Cierre (H3.2) ----------

export type NotaDeCierre = {
  avance: string;
  bloqueo: string;
  siguientePaso: string;
};

export type ResultadoNota =
  | { ok: true; nota: { avance: string; bloqueo: string | null; siguientePaso: string | null } }
  | { ok: false; error: string };

// La nota de cierre pide tres campos: qué avancé, qué me bloquea
// (opcional) y el siguiente paso. El siguiente paso es obligatorio
// mientras la regla R3 esté activa; desactivarla desactiva la validación.
export function validarNotaDeCierre(nota: NotaDeCierre, r3Activa: boolean): ResultadoNota {
  const avance = nota.avance.trim();
  const bloqueo = nota.bloqueo.trim();
  const siguientePaso = nota.siguientePaso.trim();
  if (!avance) {
    return { ok: false, error: "Escribe qué avanzaste, aunque sea poco. Es la memoria de la sesión." };
  }
  if (r3Activa && !siguientePaso) {
    return {
      ok: false,
      error:
        "El siguiente paso es obligatorio para cerrar la sesión: es la regla R3. Escríbelo y no tendrás que reconstruir el contexto al volver.",
    };
  }
  return {
    ok: true,
    nota: {
      avance,
      bloqueo: bloqueo || null,
      siguientePaso: siguientePaso || null,
    },
  };
}

// ---------- Formato del cronómetro ----------

// "32:14" hasta una hora, "1:32:14" a partir de una hora. Siempre con
// tabular-nums en la interfaz.
export function formatoCronometro(segundosTotales: number): string {
  const s = Math.max(0, Math.floor(segundosTotales));
  const horas = Math.floor(s / 3600);
  const minutos = Math.floor((s % 3600) / 60);
  const segundos = s % 60;
  const dos = (n: number) => String(n).padStart(2, "0");
  return horas > 0 ? `${horas}:${dos(minutos)}:${dos(segundos)}` : `${minutos}:${dos(segundos)}`;
}

// "1 h 32 min" para listados e historial.
export function formatoMinutos(minutos: number): string {
  const m = Math.max(0, Math.round(minutos));
  if (m < 60) return `${m} min`;
  const horas = Math.floor(m / 60);
  const resto = m % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}
