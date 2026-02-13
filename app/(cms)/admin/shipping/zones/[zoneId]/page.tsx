"use client";

import dynamic from 'next/dynamic';

const ShippingZoneEdit = dynamic(() => import('@simplycms/admin/pages/ShippingZoneEdit'), { ssr: false });

export default function Page() {
  return <ShippingZoneEdit />;
}
