import type { Metadata } from "next";
import "./globals.css";
import { Grano } from "@/components/grano";

export const metadata: Metadata = {
  title: "Órbita",
  description: "Sistema operativo personal de trabajo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Instrument+Serif:ital@0;1&family=Outfit:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-papel font-sans text-[0.9375rem] leading-[1.6] text-tinta antialiased">
        <Grano />
        {children}
      </body>
    </html>
  );
}
