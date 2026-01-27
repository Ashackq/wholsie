"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { usePathname } from "next/navigation";

interface LayoutContextType {
  hideHeaderFooter: boolean;
}

const LayoutContext = createContext<LayoutContextType>({
  hideHeaderFooter: false,
});

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [hideHeaderFooter, setHideHeaderFooter] = useState(false);

  useEffect(() => {
    // Hide header/footer on admin and invoice routes
    const shouldHide =
      pathname?.startsWith("/admin") || pathname?.startsWith("/invoice");
    setHideHeaderFooter(shouldHide || false);
  }, [pathname]);

  return (
    <LayoutContext.Provider value={{ hideHeaderFooter }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within LayoutProvider");
  }
  return context;
}
