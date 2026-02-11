"use client";

import dynamic from 'next/dynamic';

const ProductEdit = dynamic(() => import('@simplycms/admin/pages/ProductEdit'), { ssr: false });

export default function Page() {
  return <ProductEdit />;
}
