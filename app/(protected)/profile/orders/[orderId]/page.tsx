"use client";

import { useParams } from 'next/navigation';

export default function OrderDetailPage() {
  const params = useParams<{ orderId: string }>();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Order #{params.orderId}</h1>
      <p className="text-muted-foreground">Order details will appear here.</p>
    </div>
  );
}
