"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const DiscountEdit = dynamic(() => import('@simplycms/admin/pages/DiscountEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <DiscountEdit id={params.discountId as string} />;
}
