"use client";

import dynamic from 'next/dynamic';

const DiscountGroupEdit = dynamic(() => import('@simplycms/admin/pages/DiscountGroupEdit'), { ssr: false });

export default function Page() {
  return <DiscountGroupEdit />;
}
