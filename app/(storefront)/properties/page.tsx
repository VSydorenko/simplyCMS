import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import type { Metadata } from 'next';
import PropertiesPage from '@themes/default/pages/PropertiesPage';

export const revalidate = 86400;
export const metadata: Metadata = { title: 'Характеристики' };

export default async function Properties() {
  const supabase = await createServerSupabaseClient();
  const { data: properties } = await supabase
    .from('properties')
    .select('*, property_values(*)')
    .order('name');

  return <PropertiesPage properties={properties || []} />;
}
