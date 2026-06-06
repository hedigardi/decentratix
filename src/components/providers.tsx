"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { WagmiProvider } from "wagmi";

import { wagmiConfig } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  // Create one query client instance per app shell lifecycle.
  const [queryClient] = useState(() => new QueryClient());

  return (
    // Wagmi handles wallet/network state; React Query caches async data reads.
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
