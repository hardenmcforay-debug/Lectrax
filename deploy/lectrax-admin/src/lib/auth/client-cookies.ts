/** Detect Supabase auth cookies in the browser (client-only). */
export function hasClientSupabaseAuthCookies(): boolean {
  if (typeof document === "undefined") return false;

  return document.cookie.split(";").some((part) => {
    const name = part.trim().split("=")[0] ?? "";
    return (
      name.includes("-auth-token") || (name.startsWith("sb-") && name.includes("auth"))
    );
  });
}
