"use client";

import dynamic from 'next/dynamic';

const Discounts = dynamic(() => import('@simplycms/admin/pages/Discounts'), { ssr: false });

export default function Page() {
  return <Discounts />;
}
