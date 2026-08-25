import { redirect } from "next/navigation";

// La pantalla de inicio es el brief diario.
export default function Inicio() {
  redirect("/hoy");
}
