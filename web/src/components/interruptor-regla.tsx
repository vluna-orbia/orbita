// Interruptor de activación de una regla (H5.1). Un formulario al
// servidor: alternar crea versión nueva y la validación asociada se
// apaga o se enciende de verdad, porque todas leen la última versión.
// Sin JavaScript de cliente: es un botón con estado accesible.

import { alternarReglaAction } from "@/app/(app)/playbook/acciones";

export function InterruptorRegla({
  clave,
  activa,
  volverA = "lista",
}: {
  clave: string;
  activa: boolean;
  volverA?: "lista" | "ficha";
}) {
  return (
    <form action={alternarReglaAction} className="inline-flex">
      <input type="hidden" name="clave" value={clave} />
      <input type="hidden" name="volver_a" value={volverA} />
      <button
        type="submit"
        role="switch"
        aria-checked={activa}
        aria-label={activa ? `Desactivar la regla ${clave}` : `Activar la regla ${clave}`}
        title={activa ? "Desactivar la validación" : "Activar la validación"}
        className={`relative h-6 w-11 rounded-full transition-colors duration-150 ${
          activa ? "bg-verde" : "bg-linea"
        }`}
      >
        <span
          className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-superficie transition-all duration-150 ${
            activa ? "left-[23px]" : "left-[3px]"
          }`}
        />
      </button>
    </form>
  );
}
