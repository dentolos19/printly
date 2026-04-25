"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRootRouteWithContext, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import ErrorOccurred from "#/components/error-occurred";
import Loading from "#/components/loading";
import NotFound from "#/components/not-found";
import { Toaster } from "#/components/ui/sonner";
import AuthProvider from "#/lib/providers/auth";
import CartProvider from "#/lib/providers/cart";
import ServerProvider from "#/lib/providers/server";
import appCss from "../styles.css?url";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
    },
  },
});

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
}>()({
  ssr: false,
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Printly",
      },
    ],
    links: [
      {
        rel: "icon",
        href: "/icon.png",
      },
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: ({ children }: { children: ReactNode }) => (
    <html className="scroll-smooth" lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  ),
  component: () => (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
        <AuthProvider>
          <ServerProvider>
            <CartProvider>
              <Outlet />
              <Toaster />
            </CartProvider>
          </ServerProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  ),
  pendingComponent: () => (
    <main className={"h-dvh"}>
      <Loading />
    </main>
  ),
  errorComponent: ({ error }) => (
    <main className={"h-dvh"}>
      <ErrorOccurred error={error} />
    </main>
  ),
  notFoundComponent: () => (
    <main className={"h-dvh"}>
      <NotFound />
    </main>
  ),
});
