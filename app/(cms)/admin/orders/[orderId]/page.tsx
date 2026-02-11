"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const OrderDetail = dynamic(() => import('@simplycms/admin/pages/OrderDetail'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <OrderDetail id={params.orderId as string} />;
}
