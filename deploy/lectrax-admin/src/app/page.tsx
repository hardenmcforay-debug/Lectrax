import { redirect } from "next/navigation";
import { getAuthenticatedHomeRedirect } from "@/lib/auth/resolve-authenticated-home";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const dashboardPath = await getAuthenticatedHomeRedirect();
  redirect(dashboardPath ?? "/login");
}
