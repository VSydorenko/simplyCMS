import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { getActiveThemeSSR } from '@simplycms/themes';
import type { Metadata } from 'next';

export const revalidate = 1800;
export const metadata: Metadata = { title: 'Каталог' };

export default async function Catalog() {
  const [{ theme }, supabase] = await Promise.all([
    getActiveThemeSSR(),
    createServerSupabaseClient(),
  ]);

  const [{ data: sections }, { data: products }] = await Promise.all([
    supabase.from('sections').select('*').eq('is_active', true).order('sort_order'),
    supabase
      .from('products')
      .select('*, sections(*), product_modifications(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ]);

  const CatalogPage = theme.pages.CatalogPage;

  return (
    <CatalogPage
      initialSections={sections || []}
      initialProducts={products || []}
    />
  );
}
