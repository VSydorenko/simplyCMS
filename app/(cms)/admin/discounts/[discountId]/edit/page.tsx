"use client";

import dynamic from 'next/dynamic';

const DiscountEdit = dynamic(() => import('@simplycms/admin/pages/DiscountEdit'), { ssr: false });

export default function Page() {
  return <DiscountEdit />;
}
