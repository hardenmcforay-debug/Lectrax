"use client";

/**
 * Client re-export of lucide-react.
 * Lucide v1 calls createContext at module load, so Server Components must
 * import icons through this module (or another Client Component).
 */
export * from "lucide-react";
