"use client";

import dynamic from 'next/dynamic';

const Properties = dynamic(() => import('@simplycms/admin/pages/Properties'), { ssr: false });

export default function Page() {
  return <Properties />;
}
