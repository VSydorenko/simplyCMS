"use client";

import { useParams } from 'next/navigation';

export default function OrderSuccessPage() {
  const params = useParams<{ orderId: string }>();

  return (
    <div className="container-fluid py-8">
      <h1 className="text-3xl font-bold mb-4">Order Successful!</h1>
      <p className="text-muted-foreground">
        Your order <strong>{params.orderId}</strong> has been placed successfully.
      </p>
    </div>
  );
}
