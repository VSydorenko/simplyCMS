"use client";

import dynamic from 'next/dynamic';

const UserCategories = dynamic(() => import('@simplycms/admin/pages/UserCategories'), { ssr: false });

export default function Page() {
  return <UserCategories />;
}
