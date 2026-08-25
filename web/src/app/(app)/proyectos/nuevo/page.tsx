// Crear un proyecto (H1.1). El color de acento se asigna solo; con el
// cupo de activos lleno, el proyecto nace en pausa y se avisa.

import { FormularioProyecto } from "@/components/formulario-proyecto";
import { crearProyectoAction } from "../acciones";

export default function NuevoProyecto() {
  return (
    <>
      <p className="t-micro text-tinta-tenue">Proyectos</p>
      <h1 className="mt-2 font-serif text-[2rem] leading-[1.15]">Nuevo proyecto</h1>
      <FormularioProyecto action={crearProyectoAction} textoEnviar="Crear proyecto" />
    </>
  );
}
