"use client";

import dynamic from 'next/dynamic';

const Plugins = dynamic(() => import('@simplycms/admin/pages/Plugins'), { ssr: false });

export default function Page() {
  return <Plugins />;
}
