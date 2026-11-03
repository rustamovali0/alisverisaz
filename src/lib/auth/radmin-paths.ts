export const RADMIN_PANEL_PATH = "/radmin/panel";
export function isHiddenAdminEntry(path: string) {
  const normalized = path.replace(/\/+$/, "") || "/";
  return normalized === "/radmin" || normalized === "/administrator" || normalized.startsWith("/administrator/");
}
export function radminInternalPath(path: string) {
  return path.replace(/\/+$/, "") === RADMIN_PANEL_PATH ? "/admin" : path.replace(/^\/radmin(?=\/|$)/, "/admin");
}
export function radminPanelHref(href: string) {
  if (["/radmin", "/admin", "/store/dashboard"].includes(href)) return RADMIN_PANEL_PATH;
  return href.replace(/^\/(admin|store\/dashboard)(?=\/|$)/, "/radmin");
}
