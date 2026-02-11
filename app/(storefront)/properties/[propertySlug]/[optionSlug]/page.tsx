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

type Props = { params: Promise<{ propertySlug: string; optionSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { propertySlug, optionSlug } = await params;
  const supabase = await createSupabase();

  const { data: property } = await supabase
    .from('properties')
    .select('name')
    .eq('slug', propertySlug)
    .maybeSingle();

  const { data: option } = await supabase
    .from('property_values')
    .select('value')
    .eq('slug', optionSlug)
    .maybeSingle();

  if (!property || !option) return { title: 'Option Not Found' };
  return { title: `${option.value} — ${property.name}` };
}

export default async function OptionPage({ params }: Props) {
  const { propertySlug, optionSlug } = await params;
  const supabase = await createSupabase();

  const { data: property } = await supabase
    .from('properties')
    .select('*')
    .eq('slug', propertySlug)
    .maybeSingle();

  if (!property) notFound();

  const { data: option } = await supabase
    .from('property_values')
    .select('*')
    .eq('property_id', property.id)
    .eq('slug', optionSlug)
    .maybeSingle();

  if (!option) notFound();

  const { data: products } = await supabase
    .from('products')
    .select('*, product_modifications!inner(*, modification_property_values!inner(property_value_id))')
    .eq('product_modifications.modification_property_values.property_value_id', option.id)
    .eq('is_active', true);

  return (
    <div className="container-fluid py-8">
      <h1 className="text-3xl font-bold mb-2">{option.value}</h1>
      <p className="text-muted-foreground mb-6">Property: {property.name}</p>
      <p className="text-sm text-muted-foreground">{products?.length || 0} products</p>
    </div>
  );
}
