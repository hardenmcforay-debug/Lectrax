export const LANDING_FEATURE_CARDS = [
  {
    id: "attendance-management",
    title: "Attendance Management",
    description: "Track attendance using QR codes and manual verification.",
    defaultImage: "/landing/features/attendance-management.svg",
  },
  {
    id: "assignment-management",
    title: "Assignment Management",
    description: "Create, distribute, and manage assignments efficiently.",
    defaultImage: "/landing/features/assignment-management.svg",
  },
  {
    id: "continuous-assessment",
    title: "Continuous Assessment",
    description: "Record tests, assignments, and automatically calculate CA scores.",
    defaultImage: "/landing/features/continuous-assessment.svg",
  },
  {
    id: "student-analytics",
    title: "Student Analytics",
    description: "Monitor student performance and academic engagement.",
    defaultImage: "/landing/features/student-analytics.svg",
  },
  {
    id: "class-session-management",
    title: "Class Session Management",
    description: "Create and manage academic sessions with ease.",
    defaultImage: "/landing/features/class-session-management.svg",
  },
  {
    id: "secure-academic-records",
    title: "Secure Academic Records",
    description: "Keep academic data organized and protected.",
    defaultImage: "/landing/features/secure-academic-records.svg",
  },
] as const;

export type FeatureCardId = (typeof LANDING_FEATURE_CARDS)[number]["id"];

const FEATURE_CARD_IDS = new Set<string>(LANDING_FEATURE_CARDS.map((card) => card.id));

export function isFeatureCardId(value: string): value is FeatureCardId {
  return FEATURE_CARD_IDS.has(value);
}

export function getFeatureCardById(cardId: string) {
  return LANDING_FEATURE_CARDS.find((card) => card.id === cardId);
}
