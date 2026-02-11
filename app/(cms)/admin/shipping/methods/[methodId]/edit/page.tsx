"use client";

import dynamic from 'next/dynamic';

const ShippingMethodEdit = dynamic(() => import('@simplycms/admin/pages/ShippingMethodEdit'), { ssr: false });

export default function Page() {
  return <ShippingMethodEdit />;
}
