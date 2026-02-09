import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ThemeRegistry } from './ThemeRegistry';
import type { ThemeContextType, ThemeModule, ThemeRecord, ThemeSettingDefinition } from './types';

const ThemeContext = createContext<ThemeContextType | null>(null);

const DEFAULT_THEME_NAME = 'default';

interface ThemeProviderProps {
  children: React.ReactNode;
  fallbackTheme?: string;
}

export function ThemeProvider({ children, fallbackTheme = DEFAULT_THEME_NAME }: ThemeProviderProps) {
  const [activeTheme, setActiveTheme] = useState<ThemeModule | null>(null);
  const [themeName, setThemeName] = useState<string>(DEFAULT_THEME_NAME);
  const [themeSettings, setThemeSettings] = useState<Record<string, unknown>>({});
  const [themeRecord, setThemeRecord] = useState<ThemeRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTheme = useCallback(async (name: string, record?: ThemeRecord) => {
    try {
      console.log(`[ThemeProvider] Loading theme: ${name}`);
      
      // Check if theme is registered
      if (!ThemeRegistry.has(name)) {
        console.warn(`[ThemeProvider] Theme "${name}" not registered, falling back to "${fallbackTheme}"`);
        if (name !== fallbackTheme && ThemeRegistry.has(fallbackTheme)) {
          return loadTheme(fallbackTheme);
        }
        throw new Error(`Theme "${name}" is not available`);
      }

      const theme = await ThemeRegistry.load(name);
      setActiveTheme(theme);
      setThemeName(name);
      
      // Merge default settings with saved config
      const defaultSettings: Record<string, unknown> = {};
      if (theme.manifest.settings) {
        for (const [key, setting] of Object.entries(theme.manifest.settings)) {
          defaultSettings[key] = setting.default;
        }
      }
      
      const savedConfig = record?.config || {};
      setThemeSettings({ ...defaultSettings, ...savedConfig });
      
      console.log(`[ThemeProvider] Theme "${name}" loaded successfully`);
    } catch (err) {
      console.error(`[ThemeProvider] Failed to load theme "${name}":`, err);
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [fallbackTheme]);

  const fetchActiveTheme = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch active theme from database
      const { data, error: fetchError } = await supabase
        .from('themes')
        .select('*')
        .eq('is_active', true)
        .single();

      if (fetchError) {
        console.error('[ThemeProvider] Error fetching active theme:', fetchError);
        // Try to load fallback theme
        await loadTheme(fallbackTheme);
        return;
      }

      if (!data) {
        console.warn('[ThemeProvider] No active theme found, using fallback');
        await loadTheme(fallbackTheme);
        return;
      }

      // Cast the data to ThemeRecord with proper type handling
      const configData = data.config as Record<string, unknown> | null;
      const settingsData = data.settings_schema as Record<string, unknown> | null;
      
      const record: ThemeRecord = {
        id: data.id,
        name: data.name,
        display_name: data.display_name,
        version: data.version,
        description: data.description,
        author: data.author,
        preview_image: data.preview_image,
        is_active: data.is_active,
        config: configData || {},
        settings_schema: (settingsData || {}) as Record<string, ThemeSettingDefinition>,
        installed_at: data.installed_at,
        updated_at: data.updated_at,
      };

      setThemeRecord(record);
      await loadTheme(record.name, record);
    } catch (err) {
      console.error('[ThemeProvider] Failed to initialize theme:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [fallbackTheme, loadTheme]);

  const refreshTheme = useCallback(async () => {
    ThemeRegistry.clearCache();
    await fetchActiveTheme();
  }, [fetchActiveTheme]);

  useEffect(() => {
    fetchActiveTheme();
  }, [fetchActiveTheme]);

  const value: ThemeContextType = {
    activeTheme,
    themeName,
    themeSettings,
    themeRecord,
    isLoading,
    error,
    refreshTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export function useThemeSettings<T = unknown>(key: string): T | undefined {
  const { themeSettings } = useTheme();
  return themeSettings[key] as T | undefined;
}
