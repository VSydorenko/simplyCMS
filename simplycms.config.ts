export interface SimplyCMSConfig {
  supabase: { url: string; anonKey: string };
  seo: { siteName: string; defaultTitle: string; titleTemplate: string };
  locale: string;
  currency: string;
}

const config: SimplyCMSConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  seo: {
    siteName: 'SimplyCMS Store',
    defaultTitle: 'SimplyCMS Store — Best Products',
    titleTemplate: '%s | SimplyCMS Store',
  },
  locale: 'uk-UA',
  currency: 'UAH',
};

export default config;
