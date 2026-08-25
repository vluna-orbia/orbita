import { EstadoVacio } from "@/components/estado-vacio";

export default function Radar() {
  return (
    <>
      <h1 className="font-serif text-[2rem] leading-[1.15]">Radar</h1>
      <EstadoVacio>
        El radar todavía no ha corrido. Cuando lo haga, cada hallazgo dirá por qué te
        importa y qué hacer con él.
      </EstadoVacio>
    </>
  );
}
