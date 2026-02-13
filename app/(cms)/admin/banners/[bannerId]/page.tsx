"use client";

import dynamic from 'next/dynamic';

const BannerEdit = dynamic(() => import('@simplycms/admin/pages/BannerEdit'), { ssr: false });

export default function Page() {
  return <BannerEdit />;
}
