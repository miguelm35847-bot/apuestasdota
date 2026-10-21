import type { Metadata } from "next";
import { Manrope, Sora, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import AvisoVerificacion from "@/components/AvisoVerificacion";
import { DonarProvider } from "@/components/DonarProvider";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KódigoDota",
  description: "Plataforma de salas de Dota 2",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <AuthProvider>
          <DonarProvider>
            <AvisoVerificacion />
            {children}
          </DonarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
