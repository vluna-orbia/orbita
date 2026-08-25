// Estado vacío según el sistema de diseño: una invitación, no un cartel
// de "sin datos".
export function EstadoVacio({
  children,
  pista,
}: {
  children: React.ReactNode;
  pista?: string;
}) {
  return (
    <div className="mt-6 max-w-[68ch] rounded-lg border border-linea bg-superficie p-8">
      <p className="text-[1.0625rem] leading-[1.65] text-tinta-media">{children}</p>
      {pista ? <p className="mt-3 text-[0.8125rem] text-tinta-tenue">{pista}</p> : null}
    </div>
  );
}
