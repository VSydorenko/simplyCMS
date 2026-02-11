"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "../hooks/useAuth";
import { CartProvider } from "../hooks/useCart";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

interface CMSProviderProps {
  children: React.ReactNode;
  /** Optional custom QueryClient. If not provided, a default one is created. */
  customQueryClient?: QueryClient;
}

export function CMSProvider({ children, customQueryClient }: CMSProviderProps) {
  const client = customQueryClient || queryClient;

  return (
    <QueryClientProvider client={client}>
      <AuthProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
