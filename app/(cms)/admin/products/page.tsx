"use client";

import dynamic from 'next/dynamic';

const Products = dynamic(() => import('@simplycms/admin/pages/Products'), { ssr: false });

export default function Page() {
  return <Products />;
}
