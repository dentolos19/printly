import { Toaster } from "@/components/ui/sonner";
import AuthProvider from "@/lib/providers/auth";
import ServerProvider from "@/lib/providers/server";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const fontSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const fontMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Printly",
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={"en"}>
      <body className={`${fontSans.variable} ${fontMono.variable} antialiased`}>
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
