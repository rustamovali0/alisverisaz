import {
  Baby,
  BookOpen,
  BriefcaseBusiness,
  Car,
  Dumbbell,
  Hammer,
  Home,
  Leaf,
  Package,
  PawPrint,
  Shirt,
  Smartphone,
  Sparkles,
  Utensils,
} from "lucide-react";

import type { CategoryOption } from "@/lib/products/types";

export function getCategoryIcon(category: CategoryOption) {
  const value = `${category.slug} ${category.name}`.toLocaleLowerCase("az-AZ");

  if (value.includes("elektron")) {
    return Smartphone;
  }

  if (value.includes("ev") || value.includes("bag") || value.includes("bağ")) {
    return value.includes("heyvan") ? PawPrint : Home;
  }

  if (value.includes("moda") || value.includes("geyim")) {
    return Shirt;
  }

  if (value.includes("gozell") || value.includes("gözəll") || value.includes("baxim") || value.includes("baxım")) {
    return Sparkles;
  }

  if (value.includes("usaq") || value.includes("uşaq")) {
    return Baby;
  }

  if (value.includes("idman") || value.includes("outdoor")) {
    return Dumbbell;
  }

  if (value.includes("avto") || value.includes("masin") || value.includes("maşın")) {
    return Car;
  }

  if (value.includes("tikinti") || value.includes("alet") || value.includes("alət")) {
    return Hammer;
  }

  if (value.includes("kitab")) {
    return BookOpen;
  }

  if (value.includes("qida") || value.includes("icki") || value.includes("içki")) {
    return Utensils;
  }

  if (value.includes("ofis") || value.includes("defter") || value.includes("dəftər")) {
    return BriefcaseBusiness;
  }

  if (value.includes("bag") || value.includes("bağ")) {
    return Leaf;
  }

  return Package;
}
