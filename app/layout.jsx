"use client";

import { Inter } from "next/font/google";
import localFont from "next/font/local";

import "./globals.css";
import "./styles/styles.scss";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AuthContextProvider from "./contexts/AuthContext";

const aeonik = localFont({
  variable: "--font-aeonik",
  display: "swap",
  src: [
    { path: "/fonts/AEONIK-LIGHT.otf", weight: "300", style: "normal" },
    { path: "/fonts/AEONIK-REGULAR.otf", weight: "400", style: "normal" },
    { path: "/fonts/AEONIK-MEDIUM.otf", weight: "500", style: "normal" },
    { path: "/fonts/AEONIK-MEDIUM.otf", weight: "600", style: "normal" },
  ],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${aeonik.variable} ${inter.variable} ${aeonik.className} antialiased bg-app-bg text-ink-primary`}
      >
        <QueryClientProvider client={queryClient}>
          <AuthContextProvider>
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: "var(--theme-surface-elevated)",
                  color: "var(--theme-ink-primary)",
                  border: "1px solid var(--theme-border-default)",
                },
              }}
            />
            {children}
          </AuthContextProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
