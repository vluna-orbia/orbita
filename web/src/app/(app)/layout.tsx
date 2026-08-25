import { BarraMovil } from "@/components/barra-movil";
import { Lateral } from "@/components/lateral";

export default function LayoutAplicacion({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Lateral />
      <BarraMovil />
      <main className="md:pl-[216px]">
        <div className="mx-auto w-full max-w-[1180px] px-6 pb-24 pt-12 md:px-8">{children}</div>
      </main>
    </div>
  );
}
