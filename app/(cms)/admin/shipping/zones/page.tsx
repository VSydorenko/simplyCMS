"use client";

import dynamic from 'next/dynamic';

const ShippingZones = dynamic(() => import('@simplycms/admin/pages/ShippingZones'), { ssr: false });

export default function Page() {
  return <ShippingZones />;
}
