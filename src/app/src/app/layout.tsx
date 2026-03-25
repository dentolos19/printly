import type { Metadata } from "next";
import { Fira_Mono, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";
import BackendWaitOverlay from "@/components/backend-wait-overlay";
import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/lib/providers/auth";
import BackendReadinessProvider from "@/lib/providers/backend-readiness";
import CartProvider from "@/lib/providers/cart";
import ServerProvider from "@/lib/providers/server";
import { cn } from "@/lib/utils";
import "./globals.css";

const fontSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = Fira_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Printly",
};

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html className={"scroll-smooth"} lang={"en"} suppressHydrationWarning>
      <body className={cn(fontSans.variable, fontMono.variable, "antialiased")}>
        <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
          <BackendReadinessProvider>
            <AuthProvider>
              <ServerProvider>
                <CartProvider>
                  {children}
                  <BackendWaitOverlay />
                  <Toaster />
                </CartProvider>
              </ServerProvider>
            </AuthProvider>
          </BackendReadinessProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
