import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import type { Metadata } from 'next';
import CatalogPage from '@themes/default/pages/CatalogPage';

export const revalidate = 1800;
export const metadata: Metadata = { title: 'Каталог' };

export default async function Catalog() {
  const supabase = await createServerSupabaseClient();

  const [{ data: sections }, { data: products }] = await Promise.all([
    supabase.from('sections').select('*').eq('is_active', true).order('sort_order'),
    supabase
      .from('products')
      .select('*, sections(*), product_modifications(*)')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <CatalogPage
      initialSections={sections || []}
      initialProducts={products || []}
    />
  );
}
