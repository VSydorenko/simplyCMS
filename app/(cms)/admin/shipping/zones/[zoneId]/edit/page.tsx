"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const ShippingZoneEdit = dynamic(() => import('@simplycms/admin/pages/ShippingZoneEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <ShippingZoneEdit id={params.zoneId as string} />;
}
