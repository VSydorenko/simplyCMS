"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const UserEdit = dynamic(() => import('@simplycms/admin/pages/UserEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <UserEdit id={params.userId as string} />;
}
