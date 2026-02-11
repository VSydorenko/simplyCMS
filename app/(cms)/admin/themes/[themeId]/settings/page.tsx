"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const ThemeSettings = dynamic(() => import('@simplycms/admin/pages/ThemeSettings'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <ThemeSettings id={params.themeId as string} />;
}
