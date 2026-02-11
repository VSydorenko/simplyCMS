"use client";

import dynamic from 'next/dynamic';

const PriceTypeEdit = dynamic(() => import('@simplycms/admin/pages/PriceTypeEdit'), { ssr: false });

export default function Page() {
  return <PriceTypeEdit />;
}
