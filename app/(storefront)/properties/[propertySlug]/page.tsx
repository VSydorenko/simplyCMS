import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { getActiveThemeSSR } from '@simplycms/themes';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 86400;

type Props = { params: Promise<{ propertySlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { propertySlug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: property } = await supabase
    .from('section_properties')
    .select('name')
    .eq('slug', propertySlug)
    .maybeSingle();

  if (!property) return { title: 'Property Not Found' };
  return { title: property.name };
}

export default async function PropertyPage({ params }: Props) {
  const { propertySlug } = await params;
  const [{ theme }, supabase] = await Promise.all([
    getActiveThemeSSR(),
    createServerSupabaseClient(),
  ]);

  const { data: property } = await supabase
    .from('section_properties')
    .select('*, property_options(*)')
    .eq('slug', propertySlug)
    .maybeSingle();

  if (!property) notFound();

  const PropertyDetailPage = theme.pages.PropertyDetailPage;

  return <PropertyDetailPage property={property} options={property.property_options || []} />;
}
