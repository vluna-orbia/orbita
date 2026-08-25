// Aviso en línea: fondo coral-velo para lo que pide atención, papel-hondo
// para lo informativo. Sin iconos ni exclamaciones.

export function AvisoBanner({
  children,
  tono = "atencion",
}: {
  children: React.ReactNode;
  tono?: "atencion" | "neutro";
}) {
  return (
    <div
      role="status"
      className={
        tono === "atencion"
          ? "rounded-lg bg-coral-velo px-4 py-3 text-[0.9375rem] leading-[1.6] text-tinta"
          : "rounded-lg bg-papel-hondo px-4 py-3 text-[0.9375rem] leading-[1.6] text-tinta-media"
      }
    >
      {children}
    </div>
  );
}
