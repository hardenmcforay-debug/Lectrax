export function buildLecturerDashboardGreeting(name: string): string {

  const trimmed = name.trim();

  return `Welcome back${trimmed ? `, ${trimmed}` : ""}`;

}



export const LECTURER_DASHBOARD_SUBTITLE =

  "Manage attendance, assignments, and continuous assessment with Lectrax.";

