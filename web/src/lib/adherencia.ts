// Métricas de adherencia del Playbook (H5.3). Seis funciones puras, una
// por regla, con las definiciones exactas de la historia:
//
//   R1 → intentos de superar el WIP / total de transiciones a en_curso
//   R2 → semanas con `limite` o menos proyectos activos
//   R3 → sesiones cerradas con nota / total de sesiones
//   R4 → elementos del inbox procesados en el ritual / total capturados
//   R5 → resultados comprometidos cumplidos / comprometidos
//   R6 → decisiones cerradas con motivo registrado / decisiones cerradas
//
// Cada función recibe filas ya leídas de la base y el rango de la semana
// (lunes a lunes en Europe/Madrid, de semana.ts) y devuelve numerador y
// denominador, o null cuando esa semana no tiene dato con el que medir.
// La persistencia y la lectura del playbook viven en servicio-adherencia.

export type Rango = { inicio: Date; fin: Date };
export type Medida = { numerador: number; denominador: number };

export const CLAVES_CON_METRICA = ["R1", "R2", "R3", "R4", "R5", "R6"] as const;
export type ClaveConMetrica = (typeof CLAVES_CON_METRICA)[number];

function enRango(instante: Date, rango: Rango): boolean {
  return instante >= rango.inicio && instante < rango.fin;
}

// R1: intentos de superar el WIP / total de transiciones a en_curso.
// El numerador son los rechazos persistidos en wip_rejections (encargo
// 4b); el denominador, los TaskEvent con estado_nuevo en_curso. Puede
// superar 1 en una semana de muchos rechazos: se muestra tal cual, aquí
// menos es mejor. Sin transiciones ni intentos no hay dato.
export function metricaR1(
  rechazos: { creadoEl: Date }[],
  transicionesAEnCurso: { creadoEl: Date }[],
  rango: Rango
): Medida | null {
  const numerador = rechazos.filter((r) => enRango(r.creadoEl, rango)).length;
  const denominador = transicionesAEnCurso.filter((t) => enRango(t.creadoEl, rango)).length;
  if (numerador === 0 && denominador === 0) return null;
  return { numerador, denominador };
}

// R2: la semana adhiere cuando sus proyectos activos no superan el
// límite (parametros.limite de R2, nunca un 3 en duro). La cuenta de
// activos de cada semana sale de su planificación (WeeklyPlan); una
// semana sin plan no tiene dato, no es un incumplimiento.
export function metricaR2(activosDeLaSemana: number | null, limite: number): Medida | null {
  if (activosDeLaSemana === null) return null;
  return { numerador: activosDeLaSemana <= limite ? 1 : 0, denominador: 1 };
}

// R3: sesiones cerradas con nota / total de sesiones de la semana. La
// semana de una sesión es la de su arranque (mismo convenio que el
// historial de H3.4). Las abandonadas cuentan en el total y nunca como
// con nota, aunque la nota se escriba después (H3.3: se contabilizan
// aparte). Con nota = avance y siguiente paso escritos.
export function metricaR3(
  sesiones: { empezadaEl: Date; estado: "cerrada" | "abandonada"; conNota: boolean }[],
  rango: Rango
): Medida | null {
  const delRango = sesiones.filter((s) => enRango(s.empezadaEl, rango));
  if (delRango.length === 0) return null;
  const conNota = delRango.filter((s) => s.estado === "cerrada" && s.conNota).length;
  return { numerador: conNota, denominador: delRango.length };
}

// R4: elementos del inbox procesados en el ritual / total capturados.
// Capturado = evento de creación en inbox de la semana; procesado en el
// ritual = transición que sale del inbox con via_ritual, de la semana.
// Un lunes puede triar capturas de la semana anterior: el numerador
// puede superar al denominador y se muestra tal cual (documentado).
export function metricaR4(
  capturas: { creadoEl: Date }[],
  triajesEnRitual: { creadoEl: Date }[],
  rango: Rango
): Medida | null {
  const numerador = triajesEnRitual.filter((t) => enRango(t.creadoEl, rango)).length;
  const denominador = capturas.filter((c) => enRango(c.creadoEl, rango)).length;
  if (denominador === 0 && numerador === 0) return null;
  return { numerador, denominador };
}

// R5: resultados comprometidos cumplidos / comprometidos, de la
// planificación de la semana. Sin retrospectiva nadie ha verificado el
// cumplimiento: la semana queda sin dato hasta que la retro exista.
export function metricaR5(
  resultados: { cumplido: boolean | null }[],
  retroHecha: boolean
): Medida | null {
  if (!retroHecha || resultados.length === 0) return null;
  const cumplidos = resultados.filter((r) => r.cumplido === true).length;
  return { numerador: cumplidos, denominador: resultados.length };
}

// R6: decisiones cerradas con motivo registrado / decisiones cerradas en
// la semana (por su fecha de cierre).
export function metricaR6(
  decisionesCerradas: { cerradaEl: Date; conMotivo: boolean }[],
  rango: Rango
): Medida | null {
  const delRango = decisionesCerradas.filter((d) => enRango(d.cerradaEl, rango));
  if (delRango.length === 0) return null;
  return {
    numerador: delRango.filter((d) => d.conMotivo).length,
    denominador: delRango.length,
  };
}

// Valor mostrable de una medida, en porcentaje entero. El denominador
// cero con numerador positivo (posible en R1 y R4) se trata como 100
// para que la barra no divida por cero; la ficha muestra también la
// fracción cruda.
export function porcentaje(medida: Medida): number {
  if (medida.denominador === 0) return medida.numerador > 0 ? 100 : 0;
  return Math.round((medida.numerador / medida.denominador) * 100);
}

// En R1 la métrica cuenta infracciones: la barra de la ficha la pinta
// invertida (100 = ningún intento de saltar el límite) para que las seis
// barras se lean igual, más alto mejor. La fracción cruda se muestra al
// lado tal cual la define H5.3.
export function porcentajeParaBarra(clave: ClaveConMetrica, medida: Medida): number {
  const bruto = porcentaje(medida);
  if (clave === "R1") return Math.max(0, 100 - Math.min(100, bruto));
  return Math.min(100, bruto);
}
