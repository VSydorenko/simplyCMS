import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import type { Metadata } from 'next';
import PropertiesPage from '@themes/default/pages/PropertiesPage';

export const revalidate = 86400;
export const metadata: Metadata = { title: 'Характеристики' };

export default async function Properties() {
  const supabase = await createServerSupabaseClient();
  const { data: properties } = await supabase
    .from('section_properties')
    .select('*, property_options(*)')
    .eq('has_page', true)
    .order('name');

  return <PropertiesPage properties={properties || []} />;
}
