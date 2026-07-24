"use client";

import { createContext, useContext, type ReactNode } from "react";

const PortalFrameContext = createContext(false);

export function PortalFrameProvider({ children }: { children: ReactNode }) {
  return <PortalFrameContext.Provider value={true}>{children}</PortalFrameContext.Provider>;
}

/** True when chrome (header / bottom nav / swipe) is provided by a persistent layout frame. */
export function usePortalFrame(): boolean {
  return useContext(PortalFrameContext);
}
