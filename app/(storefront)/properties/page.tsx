import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Metadata } from 'next';

export const revalidate = 86400;
export const metadata: Metadata = { title: 'Properties' };

async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => { c.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); } } }
  );
}

export default async function PropertiesPage() {
  const supabase = await createSupabase();
  const { data: properties } = await supabase
    .from('properties')
    .select('*, property_values(*)')
    .order('name');

  return (
    <div className="container-fluid py-8">
      <h1 className="text-3xl font-bold mb-6">Properties</h1>
      <p className="text-muted-foreground">{properties?.length || 0} properties</p>
    </div>
  );
}
