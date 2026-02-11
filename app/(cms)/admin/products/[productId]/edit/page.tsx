"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const ProductEdit = dynamic(() => import('@simplycms/admin/pages/ProductEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <ProductEdit id={params.productId as string} />;
}
