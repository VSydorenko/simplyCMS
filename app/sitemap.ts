import type { MetadataRoute } from 'next';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com';

async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options); } catch {}
          });
        },
      },
    }
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createSupabase();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/catalog`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/properties`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.5 },
  ];

  // Dynamic section pages
  const { data: sections } = await supabase
    .from('sections')
    .select('slug, updated_at')
    .order('sort_order');

  const sectionPages: MetadataRoute.Sitemap = (sections || []).map((section) => ({
    url: `${BASE_URL}/catalog/${section.slug}`,
    lastModified: section.updated_at ? new Date(section.updated_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }));

  // Dynamic product pages
  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at, sections(slug)')
    .eq('is_active', true);

  const productPages: MetadataRoute.Sitemap = (products || []).map((product: any) => ({
    url: `${BASE_URL}/catalog/${product.sections?.slug || 'products'}/${product.slug}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [...staticPages, ...sectionPages, ...productPages];
}
