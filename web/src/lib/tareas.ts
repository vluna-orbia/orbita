// Dominio de tareas (H2.1 a H2.5): la máquina de estados, la captura con
// proyecto en línea y el bloqueo. Funciones puras; la persistencia y el
// límite de WIP viven en servicio-tareas y se validan en el servidor.

export const ESTADOS_TAREA = [
  "inbox",
  "backlog",
  "semana",
  "en_curso",
  "hecha",
  "descartada",
] as const;

export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

// Transiciones válidas (H2.2). El flujo es inbox → backlog → semana →
// en_curso → hecha, con descartada desde cualquier estado no terminal.
// Solo se entra a en_curso desde semana; en_curso puede volver a semana
// (H2.4). La casilla de la fila permite cerrar desde semana además de
// desde en_curso: el criterio literal solo restringe la entrada a
// en_curso, y una tarea pequeña no debería exigir pasar por el límite de
// WIP para marcarse hecha (decisión documentada en DUDAS.md).
const TRANSICIONES: Record<EstadoTarea, EstadoTarea[]> = {
  inbox: ["backlog", "semana", "descartada"],
  backlog: ["semana", "descartada"],
  semana: ["en_curso", "backlog", "hecha", "descartada"],
  en_curso: ["hecha", "semana", "descartada"],
  hecha: [],
  descartada: [],
};

export function esEstadoTarea(valor: string): valor is EstadoTarea {
  return (ESTADOS_TAREA as readonly string[]).includes(valor);
}

export function puedeTransicionar(desde: EstadoTarea, hacia: EstadoTarea): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

// Nombre de cada estado en la interfaz.
export const NOMBRE_ESTADO: Record<EstadoTarea, string> = {
  inbox: "Inbox",
  backlog: "Backlog",
  semana: "Semana",
  en_curso: "En curso",
  hecha: "Hecha",
  descartada: "Descartada",
};

export function mensajeTransicionInvalida(desde: EstadoTarea, hacia: EstadoTarea): string {
  if (hacia === "en_curso" && desde !== "semana") {
    return "Solo se puede empezar una tarea que esté en la semana. Muévela primero a Semana.";
  }
  return `Una tarea en ${NOMBRE_ESTADO[desde].toLowerCase()} no puede pasar a ${NOMBRE_ESTADO[
    hacia
  ].toLowerCase()}.`;
}

export function mensajeLimiteWip(limite: number): string {
  return `Ya tienes ${limite} tareas en curso. Cierra una antes de empezar otra.`;
}

// ---------- Captura (H2.1) ----------

export type ProyectoParaCaptura = { id: string; nombre: string; slug: string };

export type Captura = {
  titulo: string;
  proyectoId: string | null;
};

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

// Interpreta el texto capturado: un token @nombre asigna proyecto en
// línea, por prefijo contra nombre o slug de los proyectos no archivados,
// sin desplegable. Si no casa con ninguno, el texto queda tal cual en el
// título: el proyecto nunca es obligatorio.
export function interpretarCaptura(
  texto: string,
  proyectos: ProyectoParaCaptura[]
): Captura | { error: string } {
  const bruto = texto.trim();
  const coincidencia = /(^|\s)@([\p{L}\p{N}-]+)/u.exec(bruto);
  let titulo = bruto;
  let proyectoId: string | null = null;
  if (coincidencia) {
    const token = normalizar(coincidencia[2]);
    const proyecto = proyectos.find(
      (p) => normalizar(p.slug).startsWith(token) || normalizar(p.nombre).startsWith(token)
    );
    if (proyecto) {
      proyectoId = proyecto.id;
      titulo = (
        bruto.slice(0, coincidencia.index) +
        " " +
        bruto.slice(coincidencia.index + coincidencia[0].length)
      )
        .replace(/\s+/g, " ")
        .trim();
    }
  }
  if (!titulo) {
    return { error: "Escribe qué hay que hacer. Una frase basta." };
  }
  return { titulo, proyectoId };
}

// ---------- Bloqueos (H2.5) ----------

export type ResultadoBloqueo = { ok: true; motivo: string } | { ok: false; error: string };

export function validarBloqueo(motivo: string): ResultadoBloqueo {
  const limpio = motivo.trim();
  if (!limpio) return { ok: false, error: "El bloqueo necesita un motivo. Una frase basta." };
  return { ok: true, motivo: limpio };
}

// Una tarea está bloqueada cuando tiene motivo de bloqueo. Las bloqueadas
// no cuentan para el límite de WIP (H2.5).
export function estaBloqueada(tarea: { motivo_bloqueo: string | null }): boolean {
  return tarea.motivo_bloqueo !== null && tarea.motivo_bloqueo.trim() !== "";
}
