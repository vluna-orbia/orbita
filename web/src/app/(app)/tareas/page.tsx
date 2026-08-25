import { EstadoVacio } from "@/components/estado-vacio";

export default function Tareas() {
  return (
    <>
      <h1 className="font-serif text-[2rem] leading-[1.15]">Tareas</h1>
      <EstadoVacio>
        Captura sin fricción, límite de tres en curso y siguiente paso siempre visible. Aún
        no hay tareas que mostrar.
      </EstadoVacio>
    </>
  );
}
