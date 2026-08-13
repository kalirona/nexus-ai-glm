"use client";

import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * Providers — wraps the app with React context providers.
 *
 * Logto authentication is handled server-side via the Logto SDK (edge client)
 * in API routes and middleware. The browser never receives Logto credentials —
 * all auth calls go through Next.js API routes which validate the Logto session
 * cookie server-side.
 *
 * Auth flow:
 *   Browser → /api/logto/sign-in (redirect to Logto) → callback → session cookie
 *   Browser → /api/* (Next.js reads session cookie server-side via Logto SDK)
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
