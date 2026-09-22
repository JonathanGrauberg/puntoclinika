import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const mulish = Mulish({
  subsets: ["latin"],
  variable: "--font-mulish",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: ".clinika",
  description: "Sistema de gestión médica para centros y profesionales de la salud",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${mulish.variable} font-sans`}>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
