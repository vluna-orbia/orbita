// Capa de servicio del Playbook (H5.1, H5.2): la versión vigente, las
// mutaciones que crean versión nueva (alternar, editar, añadir, retirar)
// y el historial con qué cambió en cada versión. Las validaciones de la
// aplicación (limiteWip, limiteDeActivos, r3Activa, umbralDiasR6) leen
// siempre la última versión, así que crear versión aquí es lo que hace
// que un interruptor desactive la validación de verdad.

import { Prisma, type PrismaClient } from "@prisma/client";
import {
  claveSiguiente,
  diffDeVersiones,
  esReglaBase,
  validarParametros,
  validarRegla,
  type CategoriaRegla,
  type ReglaComparable,
} from "./playbook";
import type { Db } from "./servicio-proyectos";

const USER_ID = "vluna";

export type ReglaVigente = {
  clave: string;
  texto: string;
  categoria: string;
  activa: boolean;
  validacionDura: boolean;
  parametros: Record<string, number> | null;
  retiradaEl: Date | null;
  fechaDeAlta: Date;
};

export type VersionVigente = {
  version: number;
  fecha: Date;
  reglas: ReglaVigente[];
};

function ordenDeClave(clave: string): number {
  const numero = /^R(\d+)$/.exec(clave);
  return numero ? Number(numero[1]) : Number.MAX_SAFE_INTEGER;
}

function aReglaVigente(regla: {
  clave: string;
  texto: string;
  categoria: string;
  activa: boolean;
  validacion_dura: boolean;
  parametros: Prisma.JsonValue | null;
  retirada_el: Date | null;
  created_at: Date;
}): ReglaVigente {
  return {
    clave: regla.clave,
    texto: regla.texto,
    categoria: regla.categoria,
    activa: regla.activa,
    validacionDura: regla.validacion_dura,
    parametros: (regla.parametros as Record<string, number> | null) ?? null,
    retiradaEl: regla.retirada_el,
    fechaDeAlta: regla.created_at,
  };
}

// La última versión del playbook con todas sus reglas, retiradas
// incluidas (la interfaz las muestra tachadas en el histórico plegable).
export async function versionVigente(db: Db): Promise<VersionVigente> {
  const playbook = await db.playbook.findFirst({
    orderBy: { version: "desc" },
    include: { rules: true },
  });
  if (!playbook) return { version: 0, fecha: new Date(0), reglas: [] };
  return {
    version: playbook.version,
    fecha: playbook.created_at,
    reglas: playbook.rules
      .map(aReglaVigente)
      .sort((a, b) => ordenDeClave(a.clave) - ordenDeClave(b.clave)),
  };
}

// Reglas propias activas (sin validación asociada): son los recordatorios
// que se muestran en el ritual correspondiente según su categoría.
export async function recordatoriosDelPlaybook(db: Db): Promise<ReglaVigente[]> {
  const vigente = await versionVigente(db);
  return vigente.reglas.filter((r) => !esReglaBase(r.clave) && r.activa && !r.retiradaEl);
}

// ---------- Mutaciones: cada cambio crea una versión (H5.2) ----------

export type Mutacion =
  | { tipo: "alternar"; clave: string }
  | { tipo: "editar"; clave: string; texto: string; categoria: string; parametros: string }
  | { tipo: "anadir"; texto: string; categoria: string }
  | { tipo: "retirar"; clave: string };

export type ResultadoVersion =
  | { ok: true; version: number; motivo: string }
  | { ok: false; error: string };

type ReglaEnMemoria = {
  clave: string;
  texto: string;
  categoria: string;
  activa: boolean;
  validacion_dura: boolean;
  parametros: Prisma.JsonValue | null;
  retirada_el: Date | null;
  created_at: Date;
};

// Aplica la mutación sobre la copia en memoria de las reglas de la última
// versión y persiste la versión nueva completa. La fecha de alta de cada
// regla se conserva al copiarla entre versiones.
export async function crearVersionConCambio(
  db: PrismaClient,
  mutacion: Mutacion,
  motivoDelUsuario = "",
  ahora: Date = new Date()
): Promise<ResultadoVersion> {
  return db.$transaction(async (tx) => {
    const actual = await tx.playbook.findFirst({
      orderBy: { version: "desc" },
      include: { rules: true },
    });
    if (!actual) return { ok: false as const, error: "El playbook no existe todavía." };

    const reglas: ReglaEnMemoria[] = actual.rules.map((r) => ({
      clave: r.clave,
      texto: r.texto,
      categoria: r.categoria,
      activa: r.activa,
      validacion_dura: r.validacion_dura,
      parametros: r.parametros as Prisma.JsonValue | null,
      retirada_el: r.retirada_el,
      created_at: r.created_at,
    }));

    const porClave = (clave: string) => reglas.find((r) => r.clave === clave);
    let motivoAuto: string;

    if (mutacion.tipo === "alternar") {
      const regla = porClave(mutacion.clave);
      if (!regla || regla.retirada_el) {
        return { ok: false as const, error: "Esa regla no está en el playbook." };
      }
      regla.activa = !regla.activa;
      motivoAuto = `Regla ${regla.clave} ${regla.activa ? "activada" : "desactivada"}`;
    } else if (mutacion.tipo === "editar") {
      const regla = porClave(mutacion.clave);
      if (!regla || regla.retirada_el) {
        return { ok: false as const, error: "Esa regla no está en el playbook." };
      }
      const validacion = validarRegla(mutacion.texto, mutacion.categoria);
      if (!validacion.ok) return { ok: false as const, error: validacion.error };
      const parametros = validarParametros(regla.clave, mutacion.parametros);
      if (!parametros.ok) return { ok: false as const, error: parametros.error };
      regla.texto = validacion.texto;
      regla.categoria = validacion.categoria;
      regla.parametros = parametros.parametros as Prisma.JsonValue | null;
      motivoAuto = `Regla ${regla.clave} editada`;
    } else if (mutacion.tipo === "anadir") {
      const validacion = validarRegla(mutacion.texto, mutacion.categoria);
      if (!validacion.ok) return { ok: false as const, error: validacion.error };
      const clave = claveSiguiente(reglas.map((r) => r.clave));
      reglas.push({
        clave,
        texto: validacion.texto,
        categoria: validacion.categoria,
        activa: true,
        validacion_dura: false,
        parametros: null,
        retirada_el: null,
        created_at: ahora,
      });
      motivoAuto = `Regla ${clave} añadida`;
    } else {
      const regla = porClave(mutacion.clave);
      if (!regla || regla.retirada_el) {
        return { ok: false as const, error: "Esa regla no está en el playbook." };
      }
      if (esReglaBase(regla.clave)) {
        return {
          ok: false as const,
          error: "Las reglas base no se retiran: desactívalas si no quieres su validación.",
        };
      }
      regla.retirada_el = ahora;
      motivoAuto = `Regla ${regla.clave} retirada`;
    }

    const motivo = motivoDelUsuario.trim() || motivoAuto;
    const nueva = await tx.playbook.create({
      data: {
        user_id: USER_ID,
        version: actual.version + 1,
        changelog: motivo,
        created_at: ahora,
      },
    });
    for (const regla of reglas) {
      await tx.playbookRule.create({
        data: {
          user_id: USER_ID,
          playbook_id: nueva.id,
          clave: regla.clave,
          texto: regla.texto,
          categoria: regla.categoria,
          activa: regla.activa,
          validacion_dura: regla.validacion_dura,
          parametros: regla.parametros === null ? Prisma.JsonNull : regla.parametros,
          retirada_el: regla.retirada_el,
          created_at: regla.created_at,
        },
      });
    }
    return { ok: true as const, version: nueva.version, motivo };
  });
}

// ---------- Historial (H5.2) ----------

export type VersionDelHistorial = {
  version: number;
  fecha: Date;
  motivo: string;
  cambios: string[];
};

// Todas las versiones, de la más reciente a la primera, con la lista de
// qué cambió respecto a la anterior.
export async function historialDeVersiones(db: Db): Promise<VersionDelHistorial[]> {
  const versiones = await db.playbook.findMany({
    orderBy: { version: "asc" },
    include: { rules: true },
  });
  const comparables = versiones.map((v) =>
    v.rules.map(
      (r): ReglaComparable => ({
        clave: r.clave,
        texto: r.texto,
        categoria: r.categoria,
        activa: r.activa,
        parametros: r.parametros,
        retirada: r.retirada_el !== null,
      })
    )
  );
  return versiones
    .map((v, i) => ({
      version: v.version,
      fecha: v.created_at,
      motivo: v.changelog,
      cambios: i === 0 ? ["Playbook inicial con las seis reglas base"] : diffDeVersiones(comparables[i - 1], comparables[i]),
    }))
    .reverse();
}
