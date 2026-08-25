// Autenticación de un solo usuario (H8.1): contraseña única, cookie de
// sesión firmada de 30 días, sin registro. Este módulo usa solo Web
// Crypto para funcionar igual en el middleware (edge) y en el servidor.

export const COOKIE_SESION = "orbita_sesion";
export const DIAS_SESION = 30;
export const SEGUNDOS_SESION = DIAS_SESION * 24 * 60 * 60;

async function firmar(secreto: string, mensaje: string): Promise<string> {
  const clave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secreto),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const firma = await crypto.subtle.sign("HMAC", clave, new TextEncoder().encode(mensaje));
  return Array.from(new Uint8Array(firma))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function igualesEnTiempoConstante(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diferencia = 0;
  for (let i = 0; i < a.length; i++) {
    diferencia |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diferencia === 0;
}

// Valor de cookie: "<caducidad_ms>.<firma_hmac_hex>".
export async function crearValorSesion(secreto: string, ahoraMs = Date.now()): Promise<string> {
  const caducidad = ahoraMs + SEGUNDOS_SESION * 1000;
  return `${caducidad}.${await firmar(secreto, String(caducidad))}`;
}

export async function sesionValida(
  valor: string | undefined,
  secreto: string | undefined,
  ahoraMs = Date.now()
): Promise<boolean> {
  if (!valor || !secreto) return false;
  const [caducidadTexto, firma] = valor.split(".");
  if (!caducidadTexto || !firma) return false;
  const caducidad = Number(caducidadTexto);
  if (!Number.isFinite(caducidad) || caducidad < ahoraMs) return false;
  const esperada = await firmar(secreto, caducidadTexto);
  return igualesEnTiempoConstante(firma, esperada);
}

// Comparación de contraseñas en tiempo constante sobre digests SHA-256,
// para no filtrar la longitud.
export async function contrasenaCorrecta(entrada: string, esperada: string): Promise<boolean> {
  if (!esperada) return false;
  const digest = async (texto: string) => {
    const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
    return Array.from(new Uint8Array(d))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };
  return igualesEnTiempoConstante(await digest(entrada), await digest(esperada));
}
