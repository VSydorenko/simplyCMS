"use client";

import dynamic from 'next/dynamic';

const Reviews = dynamic(() => import('@simplycms/admin/pages/Reviews'), { ssr: false });

export default function Page() {
  return <Reviews />;
}
