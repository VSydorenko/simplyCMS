"use client";

import dynamic from 'next/dynamic';

const OrderStatuses = dynamic(() => import('@simplycms/admin/pages/OrderStatuses'), { ssr: false });

export default function Page() {
  return <OrderStatuses />;
}
