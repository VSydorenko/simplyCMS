"use client";

import dynamic from 'next/dynamic';

const PickupPointEdit = dynamic(() => import('@simplycms/admin/pages/PickupPointEdit'), { ssr: false });

export default function Page() {
  return <PickupPointEdit />;
}
