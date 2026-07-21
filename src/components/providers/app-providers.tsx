"use client";

import { LazyMotion, domAnimation } from "framer-motion";
import type { ReactNode } from "react";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return <LazyMotion features={domAnimation}>{children}</LazyMotion>;
}
