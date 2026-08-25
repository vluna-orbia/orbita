// Comprobación del criterio principal del layout y la autenticación:
// - sin sesión, toda ruta protegida redirige a /entrar
// - con sesión firmada, las seis rutas responden 200 con su contenido
// - el healthcheck responde sin autenticación
//
// Uso: con el servidor arrancado (next start) y las mismas variables de
// entorno, node scripts/comprobar-rutas.mjs [base]

import { createHmac } from "node:crypto";

const BASE = process.argv[2] ?? "http://localhost:3000";
const SECRETO = process.env.AUTH_SECRET;
if (!SECRETO) {
  console.error("Falta AUTH_SECRET en el entorno.");
  process.exit(1);
}

const caducidad = Date.now() + 30 * 24 * 60 * 60 * 1000;
const firma = createHmac("sha256", SECRETO).update(String(caducidad)).digest("hex");
const COOKIE = `orbita_sesion=${caducidad}.${firma}`;

const RUTAS = [
  ["/hoy", ["Tres cosas hoy", "Órbita"]],
  ["/proyectos", ["Proyectos", "Nuevo proyecto", "Yajoma", "Archivados"]],
  ["/tareas", ["Tareas", "límite de tres en curso"]],
  ["/radar", ["Radar", "por qué te importa"]],
  ["/rituales", ["Rituales", "retrospectiva"]],
  ["/playbook", ["Playbook", "adherencia"]],
];

// Rutas del encargo 3: detalle de proyecto, brief y decisiones.
const RUTAS_ENCARGO_3 = [
  ["/proyectos/nuevo", ["Nuevo proyecto", "Objetivo", "Crear proyecto"]],
  ["/proyectos/yajoma", ["Brief vivo", "Decisiones abiertas", "Departamento por defecto de BOLLERIA"]],
  ["/proyectos/yajoma/brief", ["Brief vivo", "Guardar versión"]],
  ["/proyectos/yajoma/versiones", ["Versiones del brief", "Comparar", "Versión 1"]],
  ["/proyectos/yajoma/editar", ["Editar proyecto", "Guardar cambios"]],
  ["/proyectos?filtro=archivados", ["Archivados", "No hay proyectos archivados"]],
];

let fallos = 0;
const ok = (nombre) => console.log(`ok   ${nombre}`);
const mal = (nombre, detalle) => {
  fallos++;
  console.log(`MAL  ${nombre} — ${detalle}`);
};

// 1. Sin sesión: redirección a /entrar.
for (const [ruta] of RUTAS) {
  const res = await fetch(BASE + ruta, { redirect: "manual" });
  const destino = res.headers.get("location") ?? "";
  if (res.status >= 300 && res.status < 400 && destino.includes("/entrar")) {
    ok(`sin sesión, ${ruta} redirige a /entrar`);
  } else {
    mal(`sin sesión, ${ruta}`, `status ${res.status}, location ${destino}`);
  }
}

// 2. Cookie mal firmada: también fuera.
{
  const res = await fetch(BASE + "/hoy", {
    redirect: "manual",
    headers: { cookie: `orbita_sesion=${caducidad}.firmafalsa` },
  });
  if (res.status >= 300 && res.status < 400) ok("cookie mal firmada rechazada");
  else mal("cookie mal firmada", `status ${res.status}`);
}

// 3. /entrar accesible sin sesión.
{
  const res = await fetch(BASE + "/entrar");
  const html = await res.text();
  if (res.status === 200 && html.includes("Contraseña") && html.includes("Entrar")) {
    ok("/entrar responde con el formulario");
  } else {
    mal("/entrar", `status ${res.status}`);
  }
}

// 4. Healthcheck sin autenticación.
{
  const res = await fetch(BASE + "/api/salud");
  const cuerpo = await res.json().catch(() => ({}));
  if (res.status === 200 && cuerpo.estado === "ok") ok("/api/salud responde ok");
  else mal("/api/salud", `status ${res.status} ${JSON.stringify(cuerpo)}`);
}

// 5. Con sesión: las seis rutas con su contenido y la navegación.
for (const [ruta, esperados] of RUTAS) {
  const res = await fetch(BASE + ruta, { headers: { cookie: COOKIE } });
  const html = await res.text();
  if (res.status !== 200) {
    mal(`con sesión, ${ruta}`, `status ${res.status}`);
    continue;
  }
  const faltan = esperados.filter((t) => !html.includes(t));
  const navegacion = ["Hoy", "Proyectos", "Tareas", "Radar", "Rituales", "Playbook"].filter(
    (t) => !html.includes(t)
  );
  if (faltan.length === 0 && navegacion.length === 0) {
    ok(`con sesión, ${ruta} muestra su contenido y la navegación`);
  } else {
    mal(`con sesión, ${ruta}`, `faltan: ${[...faltan, ...navegacion].join(", ")}`);
  }
}

// 6. Rutas del encargo 3, con sesión.
for (const [ruta, esperados] of RUTAS_ENCARGO_3) {
  const res = await fetch(BASE + ruta, { headers: { cookie: COOKIE } });
  const html = await res.text();
  if (res.status !== 200) {
    mal(`con sesión, ${ruta}`, `status ${res.status}`);
    continue;
  }
  const faltan = esperados.filter((t) => !html.includes(t));
  if (faltan.length === 0) {
    ok(`con sesión, ${ruta} muestra su contenido`);
  } else {
    mal(`con sesión, ${ruta}`, `faltan: ${faltan.join(", ")}`);
  }
}

// 7. Un slug inexistente responde 404.
{
  const res = await fetch(BASE + "/proyectos/no-existe", { headers: { cookie: COOKIE } });
  if (res.status === 404) ok("un proyecto inexistente responde 404");
  else mal("proyecto inexistente", `status ${res.status}`);
}

// 8. La raíz lleva a /hoy (con sesión).
{
  const res = await fetch(BASE + "/", { redirect: "manual", headers: { cookie: COOKIE } });
  const destino = res.headers.get("location") ?? "";
  if (res.status >= 300 && res.status < 400 && destino.includes("/hoy")) {
    ok("/ redirige a /hoy");
  } else {
    mal("/", `status ${res.status}, location ${destino}`);
  }
}

console.log(fallos === 0 ? "Todas las comprobaciones pasan." : `${fallos} comprobaciones fallan.`);
process.exit(fallos === 0 ? 0 : 1);
