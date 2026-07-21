export const authRoles = ["customer", "seller", "admin"] as const;

export type AuthRole = (typeof authRoles)[number];

export type PublicAuthRole = Exclude<AuthRole, "admin">;

export type AuthResult =
  | {
      ok: true;
      message: string;
      redirectTo: string;
    }
  | {
      ok: false;
      message: string;
    };

export function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === "string" && authRoles.includes(value as AuthRole);
}

export function isPublicAuthRole(value: unknown): value is PublicAuthRole {
  return value === "customer" || value === "seller";
}
