"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const PluginSettings = dynamic(() => import('@simplycms/admin/pages/PluginSettings'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <PluginSettings id={params.pluginId as string} />;
}
