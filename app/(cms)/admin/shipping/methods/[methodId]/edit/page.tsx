"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const ShippingMethodEdit = dynamic(() => import('@simplycms/admin/pages/ShippingMethodEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <ShippingMethodEdit id={params.methodId as string} />;
}
