"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const PriceTypeEdit = dynamic(() => import('@simplycms/admin/pages/PriceTypeEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <PriceTypeEdit id={params.priceTypeId as string} />;
}
