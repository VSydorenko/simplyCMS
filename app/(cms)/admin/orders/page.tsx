"use client";

import dynamic from 'next/dynamic';

const Orders = dynamic(() => import('@simplycms/admin/pages/Orders'), { ssr: false });

export default function Page() {
  return <Orders />;
}
