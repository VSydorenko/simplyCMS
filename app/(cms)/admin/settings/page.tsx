"use client";

import dynamic from 'next/dynamic';

const Settings = dynamic(() => import('@simplycms/admin/pages/Settings'), { ssr: false });

export default function Page() {
  return <Settings />;
}
