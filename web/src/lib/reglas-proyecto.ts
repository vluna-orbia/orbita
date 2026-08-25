// Comportamiento de las reglas según el tipo de proyecto (adenda 05).
//
// El tipo de proyecto (entrega | continuo) modifica R1, R2 y R5 según la
// tabla de la adenda. Las cinco ramas se implementan ahora como funciones
// puras, aunque el seed solo contenga proyectos de tipo entrega: son
// condicionales en la lógica de validación y en el cálculo de métricas, y
// meterlas después obligaría a reescribir las métricas de adherencia ya
// calculadas. Los encargos 3 a 5 consumen este módulo; el encargo 2 no lo
// cablea a ninguna validación porque todavía no hay lógica de negocio.

export type TipoProyecto = "entrega" | "continuo";

// Rama 1 — R2. Un proyecto de entrega ocupa una de las tres plazas de
// proyecto activo por semana; uno continuo no.
export function cuentaParaLimiteDeActivos(tipo: TipoProyecto): boolean {
  return tipo === "entrega";
}

// Rama 2 — R5. Un proyecto de entrega pide un resultado comprometido
// semanal; uno continuo trabaja con objetivo de horas semanales.
export type CompromisoSemanal = "resultado_comprometido" | "objetivo_de_horas";

export function compromisoSemanal(tipo: TipoProyecto): CompromisoSemanal {
  return tipo === "entrega" ? "resultado_comprometido" : "objetivo_de_horas";
}

export function pideResultadoComprometidoSemanal(tipo: TipoProyecto): boolean {
  return compromisoSemanal(tipo) === "resultado_comprometido";
}

// Rama 3 — R1. Las tareas de ambos tipos cuentan para el límite de
// trabajo en curso.
export function tareasCuentanParaWip(_tipo: TipoProyecto): boolean {
  return true;
}

// Rama 4 — métrica en la retrospectiva. Entrega: resultado cumplido, sí o
// no. Continuo: horas acumuladas frente a previsto.
export type MetricaRetrospectiva = "resultado_cumplido" | "horas_frente_a_previsto";

export function metricaDeRetrospectiva(tipo: TipoProyecto): MetricaRetrospectiva {
  return tipo === "entrega" ? "resultado_cumplido" : "horas_frente_a_previsto";
}

// Rama 5 — cierre del anillo orbital. Entrega: tareas de la semana
// completadas sobre tareas de la semana totales. Continuo: horas
// acumuladas sobre el objetivo total. Devuelve una fracción entre 0 y 1,
// o null cuando no hay base de cálculo: el anillo queda abierto y
// discontinuo (H1.4).
export type DatosAnillo = {
  tipo: TipoProyecto;
  tareasSemanaCompletadas?: number;
  tareasSemanaTotales?: number;
  horasAcumuladas?: number;
  horasObjetivo?: number | null;
};

export function cierreDelAnillo(datos: DatosAnillo): number | null {
  if (datos.tipo === "entrega") {
    const totales = datos.tareasSemanaTotales ?? 0;
    if (totales <= 0) return null;
    const completadas = datos.tareasSemanaCompletadas ?? 0;
    return Math.min(1, Math.max(0, completadas / totales));
  }
  const objetivo = datos.horasObjetivo ?? 0;
  if (objetivo <= 0) return null;
  const acumuladas = datos.horasAcumuladas ?? 0;
  return Math.min(1, Math.max(0, acumuladas / objetivo));
}
