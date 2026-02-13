"use client";

import dynamic from 'next/dynamic';

const UserEdit = dynamic(() => import('@simplycms/admin/pages/UserEdit'), { ssr: false });

export default function Page() {
  return <UserEdit />;
}
