"use client";

import dynamic from 'next/dynamic';

const Banners = dynamic(() => import('@simplycms/admin/pages/Banners'), { ssr: false });

export default function Page() {
  return <Banners />;
}
