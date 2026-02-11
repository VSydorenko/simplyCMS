// Theme System Exports
export * from "./types";
export { ThemeRegistry } from "./ThemeRegistry";
export { ThemeProvider, useTheme, useThemeSettings } from "./ThemeContext";
export {
  resolveTheme,
  resolveThemeWithFallback,
  isThemeAvailable,
  getAvailableThemes,
} from "./ThemeResolver";

/**
 * Convenience function: get the active (loaded) theme from the registry cache.
 * Returns undefined if no theme has been loaded yet.
 */
export function getActiveTheme(name: string) {
  const { ThemeRegistry: reg } = require("./ThemeRegistry");
  return reg.getCached(name);
}
