"use client";

import {
  BarChart3,
  Box,
  Building2,
  CreditCard,
  Heart,
  Home,
  Image,
  LayoutDashboard,
  Menu,
  Package,
  Palette,
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
  image: Image,
  layout: LayoutDashboard,
  menu: Menu,
  package: Package,
  palette: Palette,
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
  const Icon = icons[name] ?? Home;

  return <Icon className={className} aria-hidden="true" />;
}
