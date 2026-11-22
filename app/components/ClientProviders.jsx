"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import AuthContextProvider from "@/app/contexts/AuthContext";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

export default function ClientProviders({ children }) {
  return (
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
  );
}
