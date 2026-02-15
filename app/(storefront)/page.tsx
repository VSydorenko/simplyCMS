import type { Metadata } from 'next';
import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { getActiveThemeSSR } from '@simplycms/themes';
import { parseBannerRow } from '@simplycms/core/lib/bannerUtils';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Головна',
  description: 'SimplyCMS Store — інтернет-магазин',
};

export default async function Home() {
  const [{ theme }, supabase] = await Promise.all([
    getActiveThemeSSR(),
    createServerSupabaseClient(),
  ]);

  const [banners, featured, newProducts, sections] = await Promise.all([
    supabase.from('banners').select('*').eq('is_active', true),
    supabase
      .from('products')
      .select('id, name, slug, images, short_description, stock_status, is_featured, section_id, sections!products_section_id_fkey(slug)')
      .eq('is_active', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('products')
      .select('id, name, slug, images, short_description, stock_status, section_id, sections!products_section_id_fkey(slug)')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase.from('sections').select('id, name, slug').eq('is_active', true).is('parent_id', null).order('sort_order'),
  ]);

  const HomePage = theme.pages.HomePage;

  return (
    <HomePage
      banners={(banners.data || []).map(parseBannerRow)}
      featuredProducts={(featured.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        images: (p.images as string[]) || [],
        short_description: p.short_description,
        stock_status: p.stock_status,
        section: p.sections ? { slug: (p.sections as { slug: string }).slug } : null,
      }))}
      newProducts={(newProducts.data || []).map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        images: (p.images as string[]) || [],
        short_description: p.short_description,
        stock_status: p.stock_status,
        section: p.sections ? { slug: (p.sections as { slug: string }).slug } : null,
      }))}
      sections={sections.data || []}
    />
  );
}
