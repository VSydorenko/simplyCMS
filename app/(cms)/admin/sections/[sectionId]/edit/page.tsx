"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const SectionEdit = dynamic(() => import('@simplycms/admin/pages/SectionEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <SectionEdit id={params.sectionId as string} />;
}
