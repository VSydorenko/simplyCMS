import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { getActiveThemeSSR } from '@simplycms/themes';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 86400;

type Props = { params: Promise<{ propertySlug: string; optionSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { propertySlug, optionSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: property } = await supabase
    .from('section_properties')
    .select('name')
    .eq('slug', propertySlug)
    .maybeSingle();

  const { data: option } = await supabase
    .from('property_options')
    .select('name')
    .eq('slug', optionSlug)
    .maybeSingle();

  if (!property || !option) return { title: 'Option Not Found' };
  return { title: `${option.name} — ${property.name}` };
}

export default async function OptionPage({ params }: Props) {
  const { propertySlug, optionSlug } = await params;
  const [{ theme }, supabase] = await Promise.all([
    getActiveThemeSSR(),
    createServerSupabaseClient(),
  ]);

  const { data: property } = await supabase
    .from('section_properties')
    .select('*')
    .eq('slug', propertySlug)
    .maybeSingle();

  if (!property) notFound();

  const { data: option } = await supabase
    .from('property_options')
    .select('*')
    .eq('property_id', property.id)
    .eq('slug', optionSlug)
    .maybeSingle();

  if (!option) notFound();

  const { data: products } = await supabase
    .from('products')
    .select('*, product_modifications!inner(*, modification_property_values!inner(option_id))')
    .eq('product_modifications.modification_property_values.option_id', option.id)
    .eq('is_active', true);

  const PropertyOptionPage = theme.pages.PropertyOptionPage;

  return (
    <PropertyOptionPage
      property={property}
      option={option}
      products={products || []}
    />
  );
}
