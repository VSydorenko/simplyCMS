import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import PropertyDetailPage from '@themes/default/pages/PropertyDetailPage';

export const revalidate = 86400;

type Props = { params: Promise<{ propertySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { propertySlug } = await params;
  const supabase = await createServerSupabaseClient();
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
  const supabase = await createServerSupabaseClient();

  const { data: property } = await supabase
    .from('properties')
    .select('*, property_values(*)')
    .eq('slug', propertySlug)
    .maybeSingle();

  if (!property) notFound();

  return <PropertyDetailPage property={property} options={property.property_values || []} />;
}
