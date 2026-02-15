import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { getActiveThemeSSR } from '@simplycms/themes';
import type { Metadata } from 'next';

export const revalidate = 86400;
export const metadata: Metadata = { title: 'Характеристики' };

export default async function Properties() {
  const [{ theme }, supabase] = await Promise.all([
    getActiveThemeSSR(),
    createServerSupabaseClient(),
  ]);

  const { data: properties } = await supabase
    .from('section_properties')
    .select('*, property_options(*)')
    .eq('has_page', true)
    .order('name');

  const PropertiesPage = theme.pages.PropertiesPage;

  return <PropertiesPage properties={properties || []} />;
}
