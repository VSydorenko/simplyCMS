"use client";

import dynamic from 'next/dynamic';

const OrderDetail = dynamic(() => import('@simplycms/admin/pages/OrderDetail'), { ssr: false });

export default function Page() {
  return <OrderDetail />;
}
