import { ThemeRegistry } from "./ThemeRegistry";
import type { ThemeModule } from "./types";

/**
 * Resolve a theme by name.
 * Returns the loaded ThemeModule or throws if not found/registered.
 */
export async function resolveTheme(name: string): Promise<ThemeModule> {
  if (!ThemeRegistry.has(name)) {
    throw new Error(`Theme "${name}" is not registered in ThemeRegistry`);
  }
  return ThemeRegistry.load(name);
}

/**
 * Resolve a theme by name with a fallback.
 * If the primary theme is not available, tries the fallback.
 */
export async function resolveThemeWithFallback(
  name: string,
  fallback: string
): Promise<ThemeModule> {
  try {
    return await resolveTheme(name);
  } catch {
    console.warn(
      `[ThemeResolver] Theme "${name}" not available, trying fallback "${fallback}"`
    );
    return resolveTheme(fallback);
  }
}

/**
 * Check if a theme is available (registered).
 */
export function isThemeAvailable(name: string): boolean {
  return ThemeRegistry.has(name);
}

/**
 * Get all available theme names.
 */
export function getAvailableThemes(): string[] {
  return ThemeRegistry.getRegisteredThemes();
}
