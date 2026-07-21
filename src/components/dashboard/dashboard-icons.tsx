"use client";

import {
  BarChart3,
  Box,
  Building2,
  CreditCard,
  Heart,
  Home,
  Package,
  ReceiptText,
  Settings,
  ShoppingCart,
  Sparkles,
  User,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { DashboardIcon } from "@/lib/dashboard/navigation";

const icons: Record<DashboardIcon, LucideIcon> = {
  barChart: BarChart3,
  box: Box,
  building: Building2,
  creditCard: CreditCard,
  heart: Heart,
  home: Home,
  package: Package,
  receipt: ReceiptText,
  settings: Settings,
  shoppingCart: ShoppingCart,
  sparkles: Sparkles,
  user: User,
  users: Users,
};

type DashboardIconViewProps = {
  name: DashboardIcon;
  className?: string;
};

export function DashboardIconView({ name, className }: DashboardIconViewProps) {
  const Icon = icons[name];

  return <Icon className={className} aria-hidden="true" />;
}
