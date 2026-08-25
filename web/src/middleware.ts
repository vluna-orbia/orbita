import { NextRequest, NextResponse } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/auth";

// Toda la aplicación exige sesión. Quedan fuera la pantalla de entrada,
// el healthcheck y los estáticos.
export async function middleware(peticion: NextRequest) {
  const valor = peticion.cookies.get(COOKIE_SESION)?.value;
  if (await sesionValida(valor, process.env.AUTH_SECRET)) {
    return NextResponse.next();
  }
  const destino = peticion.nextUrl.clone();
  destino.pathname = "/entrar";
  destino.search = "";
  return NextResponse.redirect(destino);
}

export const config = {
  matcher: ["/((?!entrar|api/salud|_next/static|_next/image|favicon\\.ico|robots\\.txt).*)"],
};
