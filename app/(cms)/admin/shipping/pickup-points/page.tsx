"use client";

import dynamic from 'next/dynamic';

const PickupPoints = dynamic(() => import('@simplycms/admin/pages/PickupPoints'), { ssr: false });

export default function Page() {
  return <PickupPoints />;
}
