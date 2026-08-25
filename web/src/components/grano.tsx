// Grano de papel: feTurbulence fijado al viewport, perceptible de cerca
// e invisible al leer. La herramienta se siente cuaderno, no panel.
export function Grano() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.03]"
    >
      <filter id="grano-papel">
        <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
      </filter>
      <rect width="100%" height="100%" filter="url(#grano-papel)" />
    </svg>
  );
}
