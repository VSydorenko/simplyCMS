"use client";

import dynamic from 'next/dynamic';

const Sections = dynamic(() => import('@simplycms/admin/pages/Sections'), { ssr: false });

export default function Page() {
  return <Sections />;
}
