"use client";

import dynamic from 'next/dynamic';

const PropertyOptionEdit = dynamic(() => import('@simplycms/admin/pages/PropertyOptionEdit'), { ssr: false });

export default function Page() {
  return <PropertyOptionEdit />;
}
