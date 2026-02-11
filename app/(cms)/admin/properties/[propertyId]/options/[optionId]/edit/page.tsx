"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const PropertyOptionEdit = dynamic(() => import('@simplycms/admin/pages/PropertyOptionEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <PropertyOptionEdit propertyId={params.propertyId as string} optionId={params.optionId as string} />;
}
