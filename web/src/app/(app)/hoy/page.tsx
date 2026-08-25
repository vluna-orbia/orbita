import { EstadoVacio } from "@/components/estado-vacio";

// El brief diario se compone con la fecha del momento, no con la del build.
export const dynamic = "force-dynamic";

function fechaDeHoy(): string {
  const texto = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Madrid",
  })
    .format(new Date())
    .replace(",", "");
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default function Hoy() {
  return (
    <>
      <p className="t-micro text-tinta-tenue">{fechaDeHoy()}</p>
      <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">Tres cosas hoy</h1>
      <EstadoVacio pista="Las secciones del brief diario aparecen solo cuando tienen contenido.">
        Todavía no hay nada en marcha. Cuando captures tareas y empieces sesiones, tus tres
        cosas de hoy se decidirán solas.
      </EstadoVacio>
    </>
  );
}
