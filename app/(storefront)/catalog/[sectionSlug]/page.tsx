import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { getActiveThemeSSR } from '@simplycms/themes';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 1800;

type Props = { params: Promise<{ sectionSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sectionSlug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: section } = await supabase
    .from('sections')
    .select('name, description')
    .eq('slug', sectionSlug)
    .maybeSingle();

  if (!section) return { title: 'Section Not Found' };

  return {
    title: section.name,
    description: section.description || `Browse products in ${section.name}`,
  };
}

export default async function SectionPage({ params }: Props) {
  const { sectionSlug } = await params;
  const [{ theme }, supabase] = await Promise.all([
    getActiveThemeSSR(),
    createServerSupabaseClient(),
  ]);

  const { data: section } = await supabase
    .from('sections')
    .select('*')
    .eq('slug', sectionSlug)
    .maybeSingle();

  if (!section) notFound();

  const [{ data: products }, { data: allSections }] = await Promise.all([
    supabase
      .from('products')
      .select('*, product_modifications(*)')
      .eq('section_id', section.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.from('sections').select('*').eq('is_active', true).order('sort_order'),
  ]);

  const CatalogSectionPage = theme.pages.CatalogSectionPage;

  return (
    <CatalogSectionPage
      sectionSlug={sectionSlug}
      initialSection={section}
      initialSections={allSections || []}
      initialProducts={products || []}
    />
  );
}
