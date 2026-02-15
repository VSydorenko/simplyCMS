/**
 * Server-only реєстрація тем у ThemeRegistry.
 *
 * Імпортується в app/(storefront)/layout.tsx для гарантії
 * що ThemeRegistry заповнений перед викликом getActiveThemeSSR().
 *
 * Дублює реєстрацію з app/providers.tsx (client-side),
 * але без "use client" — працює на сервері.
 */
import { ThemeRegistry } from "@simplycms/themes/ThemeRegistry";

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
