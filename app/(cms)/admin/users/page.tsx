"use client";

import dynamic from 'next/dynamic';

const Users = dynamic(() => import('@simplycms/admin/pages/Users'), { ssr: false });

export default function Page() {
  return <Users />;
}
