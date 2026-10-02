"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_SITE_DATA, type SiteData } from "@/lib/site";

const SiteDataContext = createContext<SiteData>(DEFAULT_SITE_DATA);

/* Hands the menu and opening hours loaded on the server to the client sections. */
export function SiteDataProvider({ value, children }: { value: SiteData; children: ReactNode }) {
  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export const useSiteData = () => useContext(SiteDataContext);
