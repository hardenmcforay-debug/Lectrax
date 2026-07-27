import type { ReactNode } from "react";

/**
 * Remounts on navigation so the CSS page-enter animation can run.
 * Pairs with View Transitions for browsers that support them.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="lectrax-page-enter">{children}</div>;
}
