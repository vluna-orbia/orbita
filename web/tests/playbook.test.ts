// Tests de integración del Playbook (H5.1, H5.2) contra la base con
// seed. Cada mutación crea versión; el interruptor desactiva la
// validación de verdad porque limiteWip, limiteDeActivos, r3Activa y
// umbralDiasR6 leen la última versión en cada operación. Todo lo creado
// se borra: el seed queda como estaba (versión 1, seis reglas activas).

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "@prisma/client";
import {
  crearVersionConCambio,
  historialDeVersiones,
  recordatoriosDelPlaybook,
  versionVigente,
} from "../src/lib/servicio-playbook";
import { limiteWip } from "../src/lib/servicio-tareas";
import { limiteDeActivos, umbralDiasR6 } from "../src/lib/servicio-proyectos";
import { r3Activa } from "../src/lib/servicio-sesiones";

const db = new PrismaClient();
let versionBase = 0;

beforeAll(async () => {
  versionBase = (await versionVigente(db)).version;
});

afterEach(async () => {
  await db.playbook.deleteMany({ where: { version: { gt: versionBase } } });
});

afterAll(() => db.$disconnect());

describe("el interruptor desactiva la validación de verdad (H5.1)", () => {
  it("desactivar R1 apaga el límite de WIP en el servidor y reactivarla lo enciende", async () => {
    expect(await limiteWip(db)).toBe(3);
    const apagado = await crearVersionConCambio(db, { tipo: "alternar", clave: "R1" });
    expect(apagado.ok).toBe(true);
    expect(await limiteWip(db)).toBeNull();
    const encendido = await crearVersionConCambio(db, { tipo: "alternar", clave: "R1" });
    expect(encendido.ok).toBe(true);
    expect(await limiteWip(db)).toBe(3);
  });

  it("desactivar R3 apaga la nota obligatoria y R6 el umbral de decisiones", async () => {
    expect(await r3Activa(db)).toBe(true);
    await crearVersionConCambio(db, { tipo: "alternar", clave: "R3" });
    expect(await r3Activa(db)).toBe(false);

    expect(await umbralDiasR6(db)).toBe(21);
    await crearVersionConCambio(db, { tipo: "alternar", clave: "R6" });
    expect(await umbralDiasR6(db)).toBeNull();
  });
});

describe("edición de reglas y parámetros (H5.1)", () => {
  it("editar el límite de R2 cambia lo que lee la validación, sin tres en duro", async () => {
    expect(await limiteDeActivos(db)).toBe(3);
    const resultado = await crearVersionConCambio(db, {
      tipo: "editar",
      clave: "R2",
      texto: "Máximo 5 proyectos activos simultáneos.",
      categoria: "foco",
      parametros: "5",
    });
    expect(resultado.ok).toBe(true);
    expect(await limiteDeActivos(db)).toBe(5);
  });

  it("una edición inválida no crea versión", async () => {
    const antes = (await versionVigente(db)).version;
    const sinTexto = await crearVersionConCambio(db, {
      tipo: "editar",
      clave: "R1",
      texto: "   ",
      categoria: "foco",
      parametros: "3",
    });
    expect(sinTexto.ok).toBe(false);
    const parametroMalo = await crearVersionConCambio(db, {
      tipo: "editar",
      clave: "R6",
      texto: "Ninguna decisión abierta más de 21 días sin dueño y fecha.",
      categoria: "ejecución",
      parametros: "cero",
    });
    expect(parametroMalo.ok).toBe(false);
    expect((await versionVigente(db)).version).toBe(antes);
  });

  it("la fecha de alta de una regla sobrevive a las versiones", async () => {
    const antes = (await versionVigente(db)).reglas.find((r) => r.clave === "R1");
    await crearVersionConCambio(db, { tipo: "alternar", clave: "R2" });
    const despues = (await versionVigente(db)).reglas.find((r) => r.clave === "R1");
    expect(despues?.fechaDeAlta.getTime()).toBe(antes?.fechaDeAlta.getTime());
  });
});

describe("reglas propias (H5.1) y versionado (H5.2)", () => {
  it("una regla propia nace como recordatorio sin validación y se puede retirar", async () => {
    const alta = await crearVersionConCambio(db, {
      tipo: "anadir",
      texto: "Los viernes por la tarde no se empieza nada nuevo.",
      categoria: "foco",
    });
    expect(alta.ok).toBe(true);

    const vigente = await versionVigente(db);
    const propia = vigente.reglas.find((r) => r.clave === "R7");
    expect(propia?.validacionDura).toBe(false);
    expect(propia?.parametros).toBeNull();
    expect((await recordatoriosDelPlaybook(db)).map((r) => r.clave)).toContain("R7");

    const retirada = await crearVersionConCambio(db, { tipo: "retirar", clave: "R7" });
    expect(retirada.ok).toBe(true);
    expect((await recordatoriosDelPlaybook(db)).map((r) => r.clave)).not.toContain("R7");
    const trasRetirar = (await versionVigente(db)).reglas.find((r) => r.clave === "R7");
    expect(trasRetirar?.retiradaEl).not.toBeNull();
  });

  it("las reglas base no se retiran: se desactivan", async () => {
    const resultado = await crearVersionConCambio(db, { tipo: "retirar", clave: "R1" });
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.error).toContain("no se retiran");
  });

  it("el historial dice qué cambió en cada versión, con fecha y motivo", async () => {
    await crearVersionConCambio(db, { tipo: "alternar", clave: "R4" }, "Pruebo a capturar sin regla");
    await crearVersionConCambio(db, {
      tipo: "anadir",
      texto: "Una sola reunión al día.",
      categoria: "foco",
    });
    const historial = await historialDeVersiones(db);
    expect(historial[0].cambios).toContain("R7 añadida: Una sola reunión al día.");
    expect(historial[1].motivo).toBe("Pruebo a capturar sin regla");
    expect(historial[1].cambios).toContain("R4 desactivada");
    expect(historial[historial.length - 1].version).toBe(1);
    expect(historial[0].fecha.getTime()).toBeGreaterThan(0);
  });
});
