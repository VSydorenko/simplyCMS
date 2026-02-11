"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const ReviewDetail = dynamic(() => import('@simplycms/admin/pages/ReviewDetail'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <ReviewDetail id={params.reviewId as string} />;
}
