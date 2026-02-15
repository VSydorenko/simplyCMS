"use client";

import React from "react";
import { CMSProvider } from "@simplycms/core/providers/CMSProvider";
import { ThemeProvider as CMSThemeProvider } from "@simplycms/themes/ThemeContext";
import { ThemeRegistry } from "@simplycms/themes/ThemeRegistry";

// Реєстрація тем на клієнті (дублює app/theme-registry.server.ts для SSR)
if (!ThemeRegistry.has("default")) {
  ThemeRegistry.register("default", () =>
    import("@themes/default/index").then((m) => ({ default: m.default }))
  );
}

if (!ThemeRegistry.has("solarstore")) {
  ThemeRegistry.register("solarstore", () =>
    import("@themes/solarstore/index").then((m) => ({ default: m.default }))
  );
}

interface ProvidersProps {
  children: React.ReactNode;
  /** Назва активної теми з SSR (передається з layout) */
  initialThemeName?: string;
  /** Збережені налаштування теми з БД (передаються з layout) */
  initialThemeSettings?: Record<string, unknown>;
}

export function Providers({
  children,
  initialThemeName,
  initialThemeSettings,
}: ProvidersProps) {
  return (
    <CMSProvider>
      <CMSThemeProvider
        fallbackTheme="default"
        initialThemeName={initialThemeName}
        initialThemeSettings={initialThemeSettings}
      >
        {children}
      </CMSThemeProvider>
    </CMSProvider>
  );
}
