"use client";

import { createContext, useContext } from "react";

type SiteBrandingContextValue = {
  logoUrl: string | null;
};

const SiteBrandingContext = createContext<SiteBrandingContextValue>({
  logoUrl: null,
});

export function SiteBrandingProvider({
  logoUrl,
  children,
}: {
  logoUrl: string | null;
  children: React.ReactNode;
}) {
  return (
    <SiteBrandingContext.Provider value={{ logoUrl }}>{children}</SiteBrandingContext.Provider>
  );
}

export function useSiteLogo() {
  return useContext(SiteBrandingContext).logoUrl;
}
