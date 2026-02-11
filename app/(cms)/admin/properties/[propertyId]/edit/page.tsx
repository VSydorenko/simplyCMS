"use client";

import dynamic from 'next/dynamic';

const PropertyEdit = dynamic(() => import('@simplycms/admin/pages/PropertyEdit'), { ssr: false });

export default function Page() {
  return <PropertyEdit />;
}
