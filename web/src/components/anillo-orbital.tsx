// El anillo orbital (H1.4), el elemento firma del sistema de diseño.
// Trazo irregular con feTurbulence + feDisplacementMap, nunca un círculo
// limpio. El arco se cierra proporcionalmente al avance del resultado
// comprometido; sin resultado comprometido queda abierto y discontinuo.
// Activo: trazo en el color de acento del proyecto. En pausa: gris al 30%.

const RADIO = 25;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;

// Semilla estable por proyecto: cada anillo tiembla distinto.
function semillaDesde(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 977;
  return h + 1;
}

export function AnilloOrbital({
  id,
  colorAcento,
  estado,
  avance,
  tamano = 48,
  indice = 0,
  className,
}: {
  id: string;
  colorAcento: string;
  estado: "activo" | "pausado" | "archivado";
  // Fracción 0..1, o null: trazo abierto y discontinuo.
  avance: number | null;
  tamano?: number;
  indice?: number;
  className?: string;
}) {
  const filtroId = `anillo-${id}`;
  const activo = estado === "activo";
  const trazo = activo ? colorAcento : "#8A827A";
  const opacidadTrazo = activo ? 1 : 0.3;
  const abierto = avance === null;
  const largoArco = abierto ? 0 : Math.max(0.02, Math.min(1, avance)) * CIRCUNFERENCIA;

  return (
    <svg
      viewBox="0 0 64 64"
      width={tamano}
      height={tamano}
      aria-hidden="true"
      className={className}
    >
      <defs>
        <filter id={filtroId} x="-30%" y="-30%" width="160%" height="160%">
          {/* Temblor contenido (variante elegida en el encargo 3): onda
              corta y poca amplitud, la imperfección justa. Frecuencias
              altas con más escala desintegran el trazo en grano. */}
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.03"
            numOctaves="2"
            seed={semillaDesde(id)}
            result="ruido"
          />
          <feDisplacementMap in="SourceGraphic" in2="ruido" scale="3" />
        </filter>
      </defs>
      <g filter={`url(#${filtroId})`} transform="rotate(-90 32 32)">
        {/* Órbita de referencia, apenas visible. */}
        <circle
          cx="32"
          cy="32"
          r={RADIO}
          fill="none"
          stroke="#E5DDD1"
          strokeWidth="1.5"
          strokeOpacity={activo ? 0.9 : 0.5}
        />
        {abierto ? (
          // Sin resultado comprometido: trazo abierto y discontinuo.
          <circle
            cx="32"
            cy="32"
            r={RADIO}
            fill="none"
            stroke={trazo}
            strokeOpacity={opacidadTrazo * 0.85}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray="5 11"
          />
        ) : (
          // El arco se cierra en proporción al avance de la semana.
          <circle
            cx="32"
            cy="32"
            r={RADIO}
            fill="none"
            stroke={trazo}
            strokeOpacity={opacidadTrazo}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${largoArco} ${CIRCUNFERENCIA}`}
            className="anillo-dibujo"
            style={
              {
                "--anillo-largo": `${largoArco}px`,
                animationDelay: `${indice * 80}ms`,
              } as React.CSSProperties
            }
          />
        )}
      </g>
    </svg>
  );
}
