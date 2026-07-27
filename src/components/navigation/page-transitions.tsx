"use client";

import { Suspense, type ReactNode } from "react";
import { NavigationProgress } from "@/components/navigation/navigation-progress";
import { ViewTransitionNav } from "@/components/navigation/view-transition-nav";

/**
 * App-wide fast page transitions: View Transition crossfades + nav progress.
 */
export function PageTransitions({ children }: { children: ReactNode }) {
  return (
    <ViewTransitionNav>
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      {children}
    </ViewTransitionNav>
  );
}
