import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 86400;

async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => { c.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); } } }
  );
}

type Props = { params: Promise<{ propertySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { propertySlug } = await params;
  const supabase = await createSupabase();
  const { data: property } = await supabase
    .from('properties')
    .select('name')
    .eq('slug', propertySlug)
    .maybeSingle();

  if (!property) return { title: 'Property Not Found' };
  return { title: property.name };
}

export default async function PropertyPage({ params }: Props) {
  const { propertySlug } = await params;
  const supabase = await createSupabase();

  const { data: property } = await supabase
    .from('properties')
    .select('*, property_values(*)')
    .eq('slug', propertySlug)
    .maybeSingle();

  if (!property) notFound();

  return (
    <div className="container-fluid py-8">
      <h1 className="text-3xl font-bold mb-6">{property.name}</h1>
      <p className="text-muted-foreground">
        {property.property_values?.length || 0} values
      </p>
    </div>
  );
}
