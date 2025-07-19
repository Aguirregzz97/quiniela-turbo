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

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quiniela Turbo",
  description: "Created By Andres Aguirre",
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
        <SessionProvider>
          <TanstackProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              <TooltipProvider>
                <Toaster />
                <Sidebar />
                <main className="ml-0 p-6 pb-20 md:ml-64 md:pb-6">
                  {children}
                </main>
              </TooltipProvider>
            </ThemeProvider>
          </TanstackProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
