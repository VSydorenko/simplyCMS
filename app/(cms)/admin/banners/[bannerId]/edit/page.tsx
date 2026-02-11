"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const BannerEdit = dynamic(() => import('@simplycms/admin/pages/BannerEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <BannerEdit id={params.bannerId as string} />;
}
