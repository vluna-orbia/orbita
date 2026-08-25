import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Comprobación de salud del servicio web (H8.5). Verifica también la
// conexión a la base de datos.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ estado: "ok", base_de_datos: "conectada" });
  } catch {
    return NextResponse.json(
      { estado: "error", base_de_datos: "sin conexión" },
      { status: 503 }
    );
  }
}
