"use client";

import dynamic from 'next/dynamic';

const ShippingMethods = dynamic(() => import('@simplycms/admin/pages/ShippingMethods'), { ssr: false });

export default function Page() {
  return <ShippingMethods />;
}
