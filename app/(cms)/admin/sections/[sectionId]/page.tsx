"use client";

import dynamic from 'next/dynamic';

const SectionEdit = dynamic(() => import('@simplycms/admin/pages/SectionEdit'), { ssr: false });

export default function Page() {
  return <SectionEdit />;
}
