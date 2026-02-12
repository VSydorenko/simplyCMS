import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductPageClient from '@themes/default/pages/ProductPage';

export const revalidate = 3600;

type Props = { params: Promise<{ sectionSlug: string; productSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { productSlug } = await params;
  const supabase = await createServerSupabaseClient();
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
      images: images.length > 0 
        ? images
            .filter((img): img is string => typeof img === 'string')
            .map((img) => ({ url: img }))
        : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { productSlug, sectionSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: product } = await supabase
    .from('products')
    .select(`
      *,
      sections(id, slug, name),
      product_modifications(*),
      product_prices(price_type_id, price, old_price, modification_id),
      product_property_values(
        property_id,
        value,
        numeric_value,
        option_id,
        property_options:option_id(id, slug),
        section_properties:property_id(id, name, slug, property_type, has_page)
      )
    `)
    .eq('slug', productSlug)
    .maybeSingle();

  if (!product) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: Array.isArray(product.images) ? product.images : [],
    offers: {
      '@type': 'Offer',
      priceCurrency: 'UAH',
      availability: product.stock_status === 'in_stock'
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductPageClient product={product} sectionSlug={sectionSlug} />
    </>
  );
}
