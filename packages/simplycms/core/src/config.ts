export interface SimplyCMSConfig {
  supabase?: { url?: string; anonKey?: string };
  seo?: { siteName?: string; defaultTitle?: string; titleTemplate?: string };
  locale?: string;
  currency?: string;
  theme?: any;
  plugins?: any[];
}

export function defineConfig(config: SimplyCMSConfig): SimplyCMSConfig {
  return {
    ...config,
    supabase: {
      url: config.supabase?.url || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: config.supabase?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
  };
}
