"use client";

import dynamic from 'next/dynamic';

const ReviewDetail = dynamic(() => import('@simplycms/admin/pages/ReviewDetail'), { ssr: false });

export default function Page() {
  return <ReviewDetail />;
}
