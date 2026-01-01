import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/lib/providers/auth";
import ServerProvider from "@/lib/providers/server";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { Fira_Mono, Inter } from "next/font/google";
import { ReactNode } from "react";
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
    <html lang={"en"} className={"scroll-smooth"}>
      <body className={cn(fontSans.variable, fontMono.variable, "antialiased")}>
        <AuthProvider>
          <ServerProvider>
            {children}
            <Toaster />
          </ServerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
