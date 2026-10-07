import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(server = typeof window === "undefined") {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        // Each SSR render owns its client; do not retain it with a ten-minute timer.
        gcTime: server ? Infinity : 600_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
