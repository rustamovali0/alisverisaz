import {expect,it} from "vitest";
import {getDashboardPath} from "@/lib/auth/redirects";
import {isHiddenAdminEntry,radminInternalPath,radminPanelHref} from "@/lib/auth/radmin-paths";
it.each(["/radmin","/radmin/","/administrator/panel","/administrator","/administrator/anything"])("silently sends hidden entry %s to home",path=>expect(isHiddenAdminEntry(path)).toBe(true));
it.each(["/radmin/panel","/radmin/login","/radmin/danger","/administrator-shop/products","/products"])("preserves valid panel and marketplace path %s",path=>expect(isHiddenAdminEntry(path)).toBe(false));
it("maps the new entry to the existing protected dashboard, preserving section and auth routes",()=>{
 expect(radminInternalPath("/radmin/panel")).toBe("/admin");expect(radminInternalPath("/radmin/danger")).toBe("/admin/danger");expect(getDashboardPath("admin")).toBe("/radmin/panel");expect(radminPanelHref("/radmin")).toBe("/radmin/panel");expect(radminPanelHref("/admin")).toBe("/radmin/panel");expect(radminPanelHref("/admin/orders")).toBe("/radmin/orders");
});
