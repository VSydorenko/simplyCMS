"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const DiscountGroupEdit = dynamic(() => import('@simplycms/admin/pages/DiscountGroupEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <DiscountGroupEdit id={params.groupId as string} />;
}
