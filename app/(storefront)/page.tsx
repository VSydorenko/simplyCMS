import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const revalidate = 3600;

async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => { c.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); } } }
  );
}

export default async function HomePage() {
  const supabase = await createSupabase();
  const { data: banners } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  const { data: products } = await supabase
    .from('products')
    .select('*, sections(*), product_modifications(*)')
    .eq('is_active', true)
    .limit(12);

  return (
    <div className="container-fluid py-8">
      <h1 className="text-4xl font-bold">SimplyCMS Store</h1>
      <p className="mt-4 text-muted-foreground">
        {banners?.length || 0} banners, {products?.length || 0} products loaded via SSR
      </p>
    </div>
  );
}
