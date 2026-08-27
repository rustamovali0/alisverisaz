export const systemFlagDefaults = {
  order_notifications_enabled: true,
  user_notifications_enabled: true,
  seller_notifications_enabled: true,
  admin_notifications_enabled: true,
  admin_panel_enabled: true,
  seller_panel_enabled: true,
  user_access_enabled: true,
  site_enabled: true,
} as const;

export type SystemFlagKey = keyof typeof systemFlagDefaults;
export type SystemFlags = Record<SystemFlagKey, boolean>;
