import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

export const revalidate = 3600;

async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: (c) => { c.forEach(({ name, value, options }) => { try { cookieStore.set(name, value, options); } catch {} }); } } }
  );
}

type Props = { params: Promise<{ sectionSlug: string; productSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productSlug } = await params;
  const supabase = await createSupabase();
  const { data: product } = await supabase
    .from('products')
    .select('name, description, images')
    .eq('slug', productSlug)
    .maybeSingle();

  if (!product) return { title: 'Product Not Found' };

  const images = Array.isArray(product.images) ? product.images : [];

  return {
    title: product.name,
    description: product.description || `Buy ${product.name} at SimplyCMS Store`,
    openGraph: {
      title: product.name,
      description: product.description || `Buy ${product.name} at SimplyCMS Store`,
      images: images.length > 0 ? images.map((img: string) => ({ url: img })) : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { productSlug } = await params;
  const supabase = await createSupabase();

  const { data: product } = await supabase
    .from('products')
    .select('*, sections(*), product_modifications(*, modification_property_values(*, property_values(*, properties(*))))')
    .eq('slug', productSlug)
    .maybeSingle();

  if (!product) notFound();

  return (
    <div className="container-fluid py-8">
      <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
      {product.description && (
        <p className="text-muted-foreground mb-6">{product.description}</p>
      )}
      <p className="text-sm text-muted-foreground">
        {product.product_modifications?.length || 0} modifications available
      </p>
    </div>
  );
}
