import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 1800;

async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => { c.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); } } }
  );
}

type Props = { params: Promise<{ sectionSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { sectionSlug } = await params;
  const supabase = await createSupabase();
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
  const supabase = await createSupabase();

  const { data: section } = await supabase
    .from('sections')
    .select('*')
    .eq('slug', sectionSlug)
    .maybeSingle();

  if (!section) notFound();

  const { data: products } = await supabase
    .from('products')
    .select('*, product_modifications(*)')
    .eq('section_id', section.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  return (
    <div className="container-fluid py-8">
      <h1 className="text-3xl font-bold mb-6">{section.name}</h1>
      {section.description && (
        <p className="text-muted-foreground mb-4">{section.description}</p>
      )}
      <p className="text-sm text-muted-foreground">{products?.length || 0} products</p>
    </div>
  );
}
