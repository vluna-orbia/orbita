import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  COOKIE_SESION,
  SEGUNDOS_SESION,
  contrasenaCorrecta,
  crearValorSesion,
} from "@/lib/auth";

// Acceso privado (H8.1): un solo usuario, contraseña, sesión de 30 días,
// sin pantalla de registro. La comparación ocurre en el servidor.
async function entrar(formData: FormData) {
  "use server";
  const contrasena = String(formData.get("contrasena") ?? "");
  const esperada = process.env.ORBITA_PASSWORD ?? "";
  const secreto = process.env.AUTH_SECRET ?? "";
  if (!secreto || !esperada || !(await contrasenaCorrecta(contrasena, esperada))) {
    redirect("/entrar?error=1");
  }
  const almacen = await cookies();
  almacen.set(COOKIE_SESION, await crearValorSesion(secreto), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SEGUNDOS_SESION,
    path: "/",
  });
  redirect("/hoy");
}

export default async function Entrar({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-lg border border-linea bg-superficie p-8">
        <h1 className="font-serif text-[2rem] leading-[1.15]">Órbita</h1>
        <p className="mt-2 text-[0.9375rem] leading-[1.6] text-tinta-media">
          Sistema personal de trabajo. Un solo usuario, sin registro.
        </p>
        <form action={entrar} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-[0.8125rem] font-medium tracking-[0.02em] text-tinta-media">
              Contraseña
            </span>
            <Input
              type="password"
              name="contrasena"
              required
              autoFocus
              autoComplete="current-password"
            />
          </label>
          {error ? (
            <p className="text-[0.8125rem] text-rojo">
              La contraseña no coincide. Escríbela otra vez.
            </p>
          ) : null}
          <Button type="submit">Entrar</Button>
        </form>
      </div>
    </main>
  );
}
