"use client";

import dynamic from 'next/dynamic';

const ThemeSettings = dynamic(() => import('@simplycms/admin/pages/ThemeSettings'), { ssr: false });

export default function Page() {
  return <ThemeSettings />;
}
