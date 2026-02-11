"use client";

import dynamic from 'next/dynamic';

const PriceTypes = dynamic(() => import('@simplycms/admin/pages/PriceTypes'), { ssr: false });

export default function Page() {
  return <PriceTypes />;
}
