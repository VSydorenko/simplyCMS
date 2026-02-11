"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const PropertyEdit = dynamic(() => import('@simplycms/admin/pages/PropertyEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <PropertyEdit id={params.propertyId as string} />;
}
