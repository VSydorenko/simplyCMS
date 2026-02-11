"use client";

import dynamic from 'next/dynamic';

const Shipping = dynamic(() => import('@simplycms/admin/pages/Shipping'), { ssr: false });

export default function Page() {
  return <Shipping />;
}
