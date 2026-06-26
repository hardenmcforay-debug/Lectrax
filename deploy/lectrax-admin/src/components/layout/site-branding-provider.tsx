"use client";

import { createContext, useContext, useMemo } from "react";

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
  const value = useMemo(() => ({ logoUrl }), [logoUrl]);

  return (
    <SiteBrandingContext.Provider value={value}>{children}</SiteBrandingContext.Provider>
  );
}

export function useSiteLogo() {
  return useContext(SiteBrandingContext).logoUrl;
}
