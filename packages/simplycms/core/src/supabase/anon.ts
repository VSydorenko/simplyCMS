import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Анонімний Supabase-клієнт для публічних запитів без cookies.
 *
 * Використовується для кешованих server-side запитів (unstable_cache),
 * де cookie-based клієнт неприпустимий (кеш — cross-request).
 * Підходить для таблиць з RLS policy "viewable by everyone".
 *
 * НЕ використовуй для запитів що потребують авторизації.
 */
export function createAnonSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '[createAnonSupabaseClient] Відсутні змінні оточення: ' +
      'NEXT_PUBLIC_SUPABASE_URL та NEXT_PUBLIC_SUPABASE_ANON_KEY обовʼязкові.'
    );
  }

  return createClient<Database>(url, key);
}
