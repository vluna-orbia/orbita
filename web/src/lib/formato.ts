// Formato de fechas y textos cortos de la interfaz, siempre en español
// de España y en Europe/Madrid.

import { diasEntre } from "./decisiones";

export function fechaCorta(fecha: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(fecha);
}

export function fechaConHora(fecha: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Madrid",
  }).format(fecha);
}

// "hoy", "hace 1 día", "hace 12 días" — para la última sesión.
export function haceDias(fecha: Date, ahora: Date = new Date()): string {
  const dias = diasEntre(fecha, ahora);
  if (dias === 0) return "hoy";
  if (dias === 1) return "hace 1 día";
  return `hace ${dias} días`;
}
