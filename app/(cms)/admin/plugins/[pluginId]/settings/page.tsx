"use client";

import dynamic from 'next/dynamic';

const PluginSettings = dynamic(() => import('@simplycms/admin/pages/PluginSettings'), { ssr: false });

export default function Page() {
  return <PluginSettings />;
}
