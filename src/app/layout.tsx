import type { Metadata } from "next";
import { Manrope, Sora, Geist_Mono } from "next/font/google";
import "./globals.css";
import FocoModal from "@/components/FocoModal";
import { AuthProvider } from "@/components/AuthProvider";
import AvisoVerificacion from "@/components/AvisoVerificacion";
import { DonarProvider } from "@/components/DonarProvider";
import { ApuestasProvider } from "@/components/ApuestasProvider";
import { DESCRIPCION_SITIO, NOMBRE_SITIO, REDES_SITIO, TITULO_SITIO, URL_SITIO } from '@/lib/sitio';
import { Analytics } from '@vercel/analytics/next';

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
  metadataBase: new URL(URL_SITIO),
  applicationName: NOMBRE_SITIO,
  title: { default: TITULO_SITIO, template: `%s | ${NOMBRE_SITIO}` },
  description: DESCRIPCION_SITIO,
  robots: { index: true, follow: true },
  openGraph: REDES_SITIO,
  twitter: { card: 'summary', title: TITULO_SITIO, description: DESCRIPCION_SITIO, images: ['/kodigodota-icon.png'] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${manrope.variable} ${sora.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <FocoModal />
        <AuthProvider>
          <DonarProvider>
            <ApuestasProvider>
              <AvisoVerificacion />
              {children}
            </ApuestasProvider>
          </DonarProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
