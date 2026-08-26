// Verificación visual del encargo 2 con Playwright:
// - login real por el formulario de /entrar (prueba la server action)
// - las seis rutas a 375x812 y a 1440x900
// - consola sin errores en ninguna pantalla
// - capturas en el directorio indicado
//
// Uso: con el servidor arrancado, node scripts/verificar-visual.mjs [base] [dirCapturas]

import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3100";
const DIR = process.argv[3] ?? "/tmp/capturas";
const CONTRASENA = process.env.ORBITA_PASSWORD ?? "orbita-local";

const RUTAS = [
  "/hoy",
  "/proyectos",
  "/proyectos/nuevo",
  "/proyectos/yajoma",
  "/proyectos/yajoma/brief",
  "/proyectos/yajoma/versiones",
  "/proyectos/yajoma/editar",
  "/tareas",
  "/tareas?agrupar=proyecto",
  "/radar",
  "/rituales",
  "/playbook",
];

const nombreCaptura = (ruta) => ruta.slice(1).replace(/\//g, "-");

await mkdir(DIR, { recursive: true });

const navegador = await chromium.launch();
const problemas = [];

async function recorrer(nombre, viewport) {
  const contexto = await navegador.newContext({ viewport });
  const pagina = await contexto.newPage();
  pagina.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") {
      problemas.push(`[${nombre}] consola ${m.type()} en ${pagina.url()}: ${m.text()}`);
    }
  });
  pagina.on("pageerror", (e) => {
    problemas.push(`[${nombre}] error de página en ${pagina.url()}: ${e.message}`);
  });

  // Login real por el formulario.
  await pagina.goto(BASE + "/entrar", { waitUntil: "networkidle" });
  await pagina.screenshot({ path: `${DIR}/entrar-${nombre}.png`, fullPage: true });
  await pagina.fill('input[name="contrasena"]', CONTRASENA);
  await pagina.click('button[type="submit"]');
  await pagina.waitForURL("**/hoy", { timeout: 15000 });

  for (const ruta of RUTAS) {
    await pagina.goto(BASE + ruta, { waitUntil: "networkidle" });
    const desbordamiento = await pagina.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    if (desbordamiento) {
      problemas.push(`[${nombre}] desbordamiento horizontal en ${ruta}`);
    }
    await pagina.screenshot({
      path: `${DIR}/${nombreCaptura(ruta)}-${nombre}.png`,
      fullPage: true,
    });
  }

  // El formulario de cierre de una decisión se abre en la propia fila.
  await pagina.goto(BASE + "/proyectos/yajoma", { waitUntil: "networkidle" });
  await pagina.getByRole("button", { name: "Cerrar decisión" }).first().click();
  await pagina.getByText("Motivo de la elección").waitFor({ timeout: 5000 });
  const desbordamientoCierre = await pagina.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  if (desbordamientoCierre) {
    problemas.push(`[${nombre}] desbordamiento horizontal con el cierre de decisión abierto`);
  }
  await pagina.screenshot({ path: `${DIR}/decision-cierre-${nombre}.png`, fullPage: true });

  // Encargo 4b — alta y edición de decisiones en la propia sección.
  await pagina.goto(BASE + "/proyectos/yajoma", { waitUntil: "networkidle" });
  await pagina.getByRole("button", { name: "Nueva decisión" }).click();
  await pagina.getByText("Opciones consideradas, una por línea").waitFor({ timeout: 5000 });
  const desbordamientoAlta = await pagina.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  if (desbordamientoAlta) {
    problemas.push(`[${nombre}] desbordamiento horizontal con el alta de decisión abierta`);
  }
  await pagina.screenshot({ path: `${DIR}/decision-alta-${nombre}.png`, fullPage: true });
  await pagina.getByRole("button", { name: "Cancelar" }).click();
  await pagina.getByRole("button", { name: "Editar" }).first().click();
  await pagina.getByRole("button", { name: "Guardar cambios" }).waitFor({ timeout: 5000 });
  await pagina.screenshot({ path: `${DIR}/decision-edicion-${nombre}.png`, fullPage: true });

  // Encargo 4 — el detalle de una tarea, llegando por su enlace real.
  await pagina.goto(BASE + "/tareas", { waitUntil: "networkidle" });
  await pagina.locator('a[href^="/tareas/"]').first().click();
  await pagina.getByText("Historial").first().waitFor({ timeout: 5000 });
  const desbordamientoDetalle = await pagina.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  if (desbordamientoDetalle) {
    problemas.push(`[${nombre}] desbordamiento horizontal en el detalle de tarea`);
  }
  await pagina.screenshot({ path: `${DIR}/tarea-detalle-${nombre}.png`, fullPage: true });

  // Encargo 4 — la captura con la tecla c: overlay con foco, Enter crea y
  // vacía el campo, Escape cierra.
  await pagina.goto(BASE + "/hoy", { waitUntil: "networkidle" });
  if (nombre === "375") {
    await pagina.getByRole("button", { name: "Capturar" }).click();
  } else {
    await pagina.keyboard.press("c");
  }
  await pagina.getByPlaceholder(/Qué hay que hacer/).waitFor({ timeout: 5000 });
  await pagina.screenshot({ path: `${DIR}/captura-abierta-${nombre}.png`, fullPage: true });
  await pagina.keyboard.type(`Prueba visual de captura ${nombre}`);
  await pagina.keyboard.press("Enter");
  await pagina.getByText("Capturada en el inbox.").waitFor({ timeout: 10000 });
  const campoVacio = await pagina.getByPlaceholder(/Qué hay que hacer/).inputValue();
  if (campoVacio !== "") {
    problemas.push(`[${nombre}] el campo de captura no se vació tras Enter`);
  }
  await pagina.keyboard.press("Escape");

  // Encargo 4 — sesión completa solo en un tamaño: empezar con la tecla s,
  // cronómetro visible, recarga que lo conserva, y cierre con nota.
  if (nombre === "1440") {
    await pagina.keyboard.press("s");
    await pagina.getByText("Intención de la sesión").waitFor({ timeout: 5000 });
    await pagina.fill('input[name="intencion"]', "Verificación visual del encargo 4");
    await pagina.getByRole("dialog").getByRole("button", { name: "Empezar sesión" }).click();
    // "Sesión en curso" aparece en el lateral y en la sección 2 de Hoy:
    // se acota cada superficie para no violar el modo estricto.
    const tarjetaHoy = pagina.locator('section[aria-label="Sesión de trabajo"]');
    await tarjetaHoy.getByText("Sesión en curso").waitFor({ timeout: 10000 });
    await tarjetaHoy
      .getByRole("button", { name: "Cerrar sesión de trabajo" })
      .waitFor({ timeout: 5000 });
    await pagina.reload({ waitUntil: "networkidle" });
    await tarjetaHoy.getByText("Sesión en curso").waitFor({ timeout: 10000 });
    await pagina.screenshot({ path: `${DIR}/sesion-en-curso-${nombre}.png`, fullPage: true });
    await pagina.getByRole("button", { name: "Cerrar sesión de trabajo" }).first().click();
    await pagina.getByText("Qué avanzaste").waitFor({ timeout: 5000 });
    // Sin siguiente paso, R3 lo impide y el error se ve.
    await pagina.fill('textarea[name="avance"]', "Verificado el flujo de sesión");
    await pagina.getByRole("dialog").getByRole("button", { name: "Cerrar sesión de trabajo" }).click();
    await pagina.getByText(/regla R3/).first().waitFor({ timeout: 10000 });
    await pagina.screenshot({ path: `${DIR}/sesion-cierre-r3-${nombre}.png`, fullPage: true });
    await pagina.fill('input[name="siguiente_paso"]', "Nada: era una verificación");
    await pagina.getByRole("dialog").getByRole("button", { name: "Cerrar sesión de trabajo" }).click();
    await pagina.getByText("Ninguna en curso").waitFor({ timeout: 10000 });

    // El atajo g p lleva a proyectos.
    await pagina.keyboard.press("g");
    await pagina.keyboard.press("p");
    await pagina.waitForURL("**/proyectos", { timeout: 5000 });
  }

  // Contraseña incorrecta: mensaje de error sin romper nada.
  if (nombre === "375") {
    const contexto2 = await navegador.newContext({ viewport });
    const pagina2 = await contexto2.newPage();
    await pagina2.goto(BASE + "/entrar", { waitUntil: "networkidle" });
    await pagina2.fill('input[name="contrasena"]', "no-es-esta");
    await pagina2.click('button[type="submit"]');
    await pagina2.waitForURL("**/entrar?error=1", { timeout: 15000 });
    try {
      await pagina2.getByText("La contraseña no coincide").waitFor({ timeout: 10000 });
    } catch {
      problemas.push("[375] falta el mensaje de contraseña incorrecta");
    }
    await pagina2.screenshot({ path: `${DIR}/entrar-error-375.png`, fullPage: true });
    await contexto2.close();
  }

  await contexto.close();
}

await recorrer("375", { width: 375, height: 812 });
await recorrer("1440", { width: 1440, height: 900 });

await navegador.close();

if (problemas.length === 0) {
  console.log("Verificación visual limpia: login real, todas las rutas en dos tamaños, consola sin errores.");
  process.exit(0);
}
console.log(`${problemas.length} problemas:`);
for (const p of problemas) console.log(" - " + p);
process.exit(1);
