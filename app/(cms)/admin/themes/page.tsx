"use client";

import dynamic from 'next/dynamic';

const Themes = dynamic(() => import('@simplycms/admin/pages/Themes'), { ssr: false });

export default function Page() {
  return <Themes />;
}
