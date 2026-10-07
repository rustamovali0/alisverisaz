"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import { useState, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/query/client";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => createQueryClient());
  return <QueryClientProvider client={queryClient}><LazyMotion features={domAnimation}>{children}</LazyMotion></QueryClientProvider>;
}
