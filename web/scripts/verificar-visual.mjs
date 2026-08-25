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

const RUTAS = ["/hoy", "/proyectos", "/tareas", "/radar", "/rituales", "/playbook"];

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
      path: `${DIR}/${ruta.slice(1)}-${nombre}.png`,
      fullPage: true,
    });
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
  console.log("Verificación visual limpia: login real, seis rutas en dos tamaños, consola sin errores.");
  process.exit(0);
}
console.log(`${problemas.length} problemas:`);
for (const p of problemas) console.log(" - " + p);
process.exit(1);
