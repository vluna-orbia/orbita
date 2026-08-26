// Semana de trabajo: empieza en lunes y usa Europe/Madrid en todos los
// cálculos. La regla la fija el encargo 5 (rituales); el anillo orbital
// del encargo 3 ya la necesita para saber qué tareas son "de la semana".

const ZONA = "Europe/Madrid";

type FechaCivil = { anio: number; mes: number; dia: number };

// Fecha civil (año, mes, día) de un instante visto desde Europe/Madrid.
function fechaCivilMadrid(instante: Date): FechaCivil {
  const texto = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instante);
  const [anio, mes, dia] = texto.split("-").map(Number);
  return { anio, mes, dia };
}

function lunesDeLaSemana(civil: FechaCivil): FechaCivil {
  const fecha = new Date(Date.UTC(civil.anio, civil.mes - 1, civil.dia));
  const desdeLunes = (fecha.getUTCDay() + 6) % 7; // 0 = lunes
  fecha.setUTCDate(fecha.getUTCDate() - desdeLunes);
  return { anio: fecha.getUTCFullYear(), mes: fecha.getUTCMonth() + 1, dia: fecha.getUTCDate() };
}

// Lunes de la semana del instante dado, como fecha pura a medianoche UTC.
// Es el valor que guarda WeeklyPlan.semana_inicio (@db.Date).
export function inicioDeSemana(instante: Date = new Date()): Date {
  const lunes = lunesDeLaSemana(fechaCivilMadrid(instante));
  return new Date(Date.UTC(lunes.anio, lunes.mes - 1, lunes.dia));
}

// Instante exacto de la medianoche de una fecha civil en Europe/Madrid.
// Sin dependencias: parte de la medianoche UTC y corrige el desfase de la
// zona iterando (dos pasadas bastan, incluidos los cambios de hora).
function instanteMedianocheMadrid(civil: FechaCivil): Date {
  const formato = new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const objetivoMs = Date.UTC(civil.anio, civil.mes - 1, civil.dia);
  let t = objetivoMs;
  for (let i = 0; i < 3; i++) {
    const partes = Object.fromEntries(
      formato.formatToParts(new Date(t)).map((p) => [p.type, p.value])
    );
    const civilDeT = Date.UTC(
      Number(partes.year),
      Number(partes.month) - 1,
      Number(partes.day),
      Number(partes.hour) % 24,
      Number(partes.minute),
      Number(partes.second)
    );
    const desvio = civilDeT - objetivoMs;
    if (desvio === 0) break;
    t -= desvio;
  }
  return new Date(t);
}

// Instante en que empieza la semana del instante dado (lunes 00:00 en
// Europe/Madrid). Para filtrar timestamps como Task.completed_at.
export function instanteInicioDeSemana(instante: Date = new Date()): Date {
  return instanteMedianocheMadrid(lunesDeLaSemana(fechaCivilMadrid(instante)));
}

// Instante en que termina la semana, exclusivo (lunes siguiente 00:00).
export function instanteFinDeSemana(instante: Date = new Date()): Date {
  const lunes = lunesDeLaSemana(fechaCivilMadrid(instante));
  const siguiente = new Date(Date.UTC(lunes.anio, lunes.mes - 1, lunes.dia + 7));
  return instanteMedianocheMadrid({
    anio: siguiente.getUTCFullYear(),
    mes: siguiente.getUTCMonth() + 1,
    dia: siguiente.getUTCDate(),
  });
}

function sumarDias(civil: FechaCivil, dias: number): FechaCivil {
  const fecha = new Date(Date.UTC(civil.anio, civil.mes - 1, civil.dia + dias));
  return { anio: fecha.getUTCFullYear(), mes: fecha.getUTCMonth() + 1, dia: fecha.getUTCDate() };
}

// Medianoche en Madrid del día civil del instante dado. Es el corte que
// separa "hoy" de "ayer" para el brief diario.
export function instanteInicioDeDia(instante: Date = new Date()): Date {
  return instanteMedianocheMadrid(fechaCivilMadrid(instante));
}

// Rango [inicio, fin) del día civil anterior al instante, en Europe/Madrid.
// El fin es la medianoche de hoy, exclusivo: una sesión cerrada a las
// 00:00 de hoy ya no es de ayer. Los cambios de hora quedan absorbidos
// por el cálculo de medianoche (el día de ayer puede durar 23 o 25 horas).
export function rangoDeAyer(ahora: Date = new Date()): { inicio: Date; fin: Date } {
  const hoy = fechaCivilMadrid(ahora);
  return {
    inicio: instanteMedianocheMadrid(sumarDias(hoy, -1)),
    fin: instanteMedianocheMadrid(hoy),
  };
}

// Día civil del instante en Madrid, como fecha pura a medianoche UTC.
// Mismo convenio que inicioDeSemana: es el valor que guarda un @db.Date
// (lo usa el posponer del aviso de ritual, H4.3).
export function fechaCivilPura(instante: Date = new Date()): Date {
  const civil = fechaCivilMadrid(instante);
  return new Date(Date.UTC(civil.anio, civil.mes - 1, civil.dia));
}

// Día de la semana civil en Madrid: 0 = lunes ... 6 = domingo. Decide
// cuándo toca el aviso de ritual pendiente (lunes plan, viernes retro).
export function diaDeLaSemana(instante: Date = new Date()): number {
  const civil = fechaCivilMadrid(instante);
  const fecha = new Date(Date.UTC(civil.anio, civil.mes - 1, civil.dia));
  return (fecha.getUTCDay() + 6) % 7;
}

// Los lunes de las últimas n semanas (fechas puras, como semana_inicio),
// de la más antigua a la de la semana en curso incluida.
export function ultimasSemanas(n: number, ahora: Date = new Date()): Date[] {
  const actual = inicioDeSemana(ahora);
  const semanas: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    semanas.push(
      new Date(
        Date.UTC(actual.getUTCFullYear(), actual.getUTCMonth(), actual.getUTCDate() - i * 7)
      )
    );
  }
  return semanas;
}

// Rango [inicio, fin) en instantes reales de la semana cuyo lunes es la
// fecha pura dada: de la medianoche de Madrid de ese lunes a la del lunes
// siguiente, con los cambios de hora absorbidos. Es el rango con el que
// se calculan las métricas de adherencia (H5.3).
export function rangoDeSemanaPura(lunes: Date): { inicio: Date; fin: Date } {
  const civil = {
    anio: lunes.getUTCFullYear(),
    mes: lunes.getUTCMonth() + 1,
    dia: lunes.getUTCDate(),
  };
  return {
    inicio: instanteMedianocheMadrid(civil),
    fin: instanteMedianocheMadrid(sumarDias(civil, 7)),
  };
}
