"use client";

import React from "react";
import { CMSProvider } from "@simplycms/core/providers/CMSProvider";
import { ThemeProvider as CMSThemeProvider } from "@simplycms/themes/ThemeContext";
import { ThemeRegistry } from "@simplycms/themes/ThemeRegistry";

// Register the default theme with dynamic import
if (!ThemeRegistry.has("default")) {
  ThemeRegistry.register("default", () =>
    import("@themes/default/index").then((m) => ({ default: m.default }))
  );
}

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <CMSProvider>
      <CMSThemeProvider fallbackTheme="default">
        {children}
      </CMSThemeProvider>
    </CMSProvider>
  );
}
