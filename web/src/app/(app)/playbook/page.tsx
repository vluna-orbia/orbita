import { EstadoVacio } from "@/components/estado-vacio";

export default function Playbook() {
  return (
    <>
      <h1 className="font-serif text-[2rem] leading-[1.15]">Playbook</h1>
      <EstadoVacio>
        Las reglas de tu método, versionadas y con su adherencia medida semana a semana.
        Desactivar una regla desactiva su validación.
      </EstadoVacio>
    </>
  );
}
