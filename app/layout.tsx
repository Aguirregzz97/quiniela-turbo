import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/Providers/ThemeProvider";
import Sidebar from "@/components/Navbar/Sidebar";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Toaster } from "@/components/ui/toaster";
import TanstackProvider from "@/Providers/TanstackProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import SessionProvider from "@/Providers/SessionProvider";
import MainContent from "@/components/MainContent";
import NextTopLoader from "nextjs-toploader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quiniela Turbo",
  description:
    "Compite con tus amigos prediciendo resultados de fútbol. Crea quinielas, juega en modo Survivor y demuestra quién sabe más de fútbol mexicano. ¡Únete ahora!",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://www.quinielaturbo.com"
  ),
  openGraph: {
    title: "Quiniela Turbo",
    description:
      "Compite con tus amigos prediciendo resultados de fútbol. Crea quinielas, juega en modo Survivor y demuestra quién sabe más de fútbol mexicano. ¡Únete ahora!",
    locale: "es_MX",
    type: "website",
    siteName: "Quiniela Turbo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Quiniela Turbo",
    description:
      "Compite con tus amigos prediciendo resultados de fútbol. Crea quinielas, juega en modo Survivor y demuestra quién sabe más de fútbol mexicano. ¡Únete ahora!",
  },
  icons: {
    icon: "/img/logo.png",
    apple: "/img/logo.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} h-screen bg-background`}
      lang="en"
    >
      <body
        suppressHydrationWarning
        className={`${inter.className} h-full bg-background`}
      >
        <NextTopLoader
          color="var(--primary)"
          showSpinner={false}
          height={3}
          shadow={false}
        />
        <SessionProvider>
          <TanstackProvider>
            <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
              <TooltipProvider>
                <Toaster />
                <Sidebar />
                <MainContent>{children}</MainContent>
              </TooltipProvider>
            </ThemeProvider>
          </TanstackProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
