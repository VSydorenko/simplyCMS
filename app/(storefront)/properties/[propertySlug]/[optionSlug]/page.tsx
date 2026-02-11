import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PropertyOptionPage from '@themes/default/pages/PropertyOptionPage';

export const revalidate = 86400;

type Props = { params: Promise<{ propertySlug: string; optionSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { propertySlug, optionSlug } = await params;
  const supabase = await createServerSupabaseClient();

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
  const supabase = await createServerSupabaseClient();

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
    <PropertyOptionPage
      property={property}
      option={option}
      products={products || []}
    />
  );
}
