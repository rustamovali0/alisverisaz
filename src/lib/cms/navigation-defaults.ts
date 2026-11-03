import {dashboardNavigation, type DashboardNavItem} from "@/lib/dashboard/navigation";
export type NavigationSeedMenu = {
  key: string;
  title: string;
  location: string;
  items: Array<DashboardNavItem & {
    requiredRole?: "seller" | "customer" | "admin" | null;
  }>;
};

export const defaultNavigationSeedMenus: NavigationSeedMenu[] = [
  {
    key: "main_header",
    title: "Saytın əsas menyusu",
    location: "header",
    items: [
      {title:"Ana səhifə",href:"/",icon:"home"},
      {title:"Məhsullar",href:"/products",icon:"box"},
      {title:"Endirimlər",href:"/products?discount=true",icon:"receipt"},
      {title:"Mağazalar",href:"/stores",icon:"building"},
      {title:"İcarə",href:"/products?commerceType=rental",icon:"package"},
      {title:"VIP məhsullar",href:"/products?vip=true",icon:"sparkles"},
    ],
  },
  {
    key: "seller_sidebar",
    title: "Satıcı paneli",
    location: "seller_sidebar",
    items: dashboardNavigation.seller.map((item) => ({
      ...item,
      requiredRole: "seller",
    })),
  },
  {
    key: "customer_sidebar",
    title: "Alıcı paneli",
    location: "customer_sidebar",
    items: dashboardNavigation.customer.map((item) => ({
      ...item,
      requiredRole: "customer",
    })),
  },
  {
    key: "admin_extra",
    title: "Admin menyusu",
    location: "admin_extra",
    items: dashboardNavigation.admin.map((item) => ({
      ...item,
      requiredRole: "admin",
    })),
  },
];
