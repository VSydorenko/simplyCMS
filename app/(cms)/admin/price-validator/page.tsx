"use client";

import dynamic from 'next/dynamic';

const PriceValidator = dynamic(() => import('@simplycms/admin/pages/PriceValidator'), { ssr: false });

export default function Page() {
  return <PriceValidator />;
}
