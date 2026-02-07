import type { Metadata } from "next";
// 1. Cambiamos la importación a Plus Jakarta Sans
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

// 2. Configuramos la nueva fuente
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "Gestor Contable",
  description: "Control financiero personal y familiar",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        // 3. Aplicamos la fuente globalmente
        className={`${jakarta.className} antialiased text-slate-900`}
      >
        {children}
      </body>
    </html>
  );
}