"use client";

// Botón de arranque de sesión (H3.1). Dispara el mismo modal que la tecla
// s. En móvil es la única superficie de arranque hasta que la pantalla
// Hoy completa llegue con el encargo 7.

import { Button } from "@/components/ui/button";
import { EVENTO_EMPEZAR } from "./capa-global";

export function BotonEmpezarSesion() {
  return (
    <Button onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_EMPEZAR))}>
      Empezar sesión
    </Button>
  );
}
