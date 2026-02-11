import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';

export const revalidate = 1800;
export const metadata: Metadata = { title: 'Catalog' };

async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => { c.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); } } });
}

export default async function CatalogPage() {
  const supabase = await createSupabase();
  const { data: sections } = await supabase.from('sections').select('*').order('sort_order');
  const { data: products } = await supabase
    .from('products')
    .select('*, sections(*), product_modifications(*)')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <div className="container-fluid py-8">
      <h1 className="text-3xl font-bold mb-6">Catalog</h1>
      <p className="text-muted-foreground">{sections?.length || 0} sections, {products?.length || 0} products</p>
    </div>
  );
}
