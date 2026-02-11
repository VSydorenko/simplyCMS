"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const PickupPointEdit = dynamic(() => import('@simplycms/admin/pages/PickupPointEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <PickupPointEdit id={params.pointId as string} />;
}
