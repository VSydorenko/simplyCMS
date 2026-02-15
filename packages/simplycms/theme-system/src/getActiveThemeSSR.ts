import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { ThemeRegistry } from "./ThemeRegistry";
import type { ActiveThemeSSR, ThemeRecord } from "./types";

const DEFAULT_THEME = "default";

/**
 * Створити анонімний Supabase-клієнт для публічних запитів.
 * Не використовує cookies() — безпечний для unstable_cache.
 * Таблиця themes має RLS policy "Themes are viewable by everyone".
 */
function createAnonSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Отримати запис активної теми з БД.
 * Обгорнуто в unstable_cache для cross-request кешування.
 * Використовує анонімний клієнт (без cookies) для сумісності з cache.
 */
const getCachedActiveThemeRecord = unstable_cache(
  async (): Promise<ThemeRecord | null> => {
    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase
      .from("themes")
      .select("*")
      .eq("is_active", true)
      .single();

    if (error || !data) return null;

    return {
      id: data.id,
      name: data.name,
      display_name: data.display_name,
      version: data.version,
      description: data.description,
      author: data.author,
      preview_image: data.preview_image,
      is_active: data.is_active,
      settings: (data.settings as Record<string, unknown>) || {},
      created_at: data.created_at ?? new Date().toISOString(),
      updated_at: data.updated_at ?? new Date().toISOString(),
    };
  },
  ["active-theme"],
  { revalidate: 3600, tags: ["active-theme"] }
);

/**
 * SSR-резолюція активної теми.
 *
 * Читає активну тему з БД (кешовано через unstable_cache),
 * резолвить ThemeModule через ThemeRegistry.
 *
 * ВАЖЛИВО: перед викликом потрібно зареєструвати теми через
 * import "app/theme-registry.server.ts" у layout.tsx
 */
export async function getActiveThemeSSR(): Promise<ActiveThemeSSR> {
  // Перевірка що теми зареєстровані
  if (!ThemeRegistry.has(DEFAULT_THEME)) {
    throw new Error(
      '[getActiveThemeSSR] ThemeRegistry порожній. ' +
      'Імпортуйте "app/theme-registry.server.ts" у layout.tsx перед викликом getActiveThemeSSR().'
    );
  }

  const record = await getCachedActiveThemeRecord();

  // Визначити назву активної теми
  const themeName = record?.name ?? DEFAULT_THEME;

  // Fallback на default якщо тема не зареєстрована в Registry
  const resolvedName = ThemeRegistry.has(themeName) ? themeName : DEFAULT_THEME;

  const theme = await ThemeRegistry.load(resolvedName);

  // Якщо запису в БД немає — створити мінімальний ThemeRecord з manifest
  const themeRecord: ThemeRecord = record ?? {
    id: "",
    name: resolvedName,
    display_name: theme.manifest.displayName,
    version: theme.manifest.version,
    description: theme.manifest.description ?? null,
    author: theme.manifest.author ?? null,
    preview_image: null,
    is_active: true,
    settings: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { theme, themeName: resolvedName, themeRecord };
}
