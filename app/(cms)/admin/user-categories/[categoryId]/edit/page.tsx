"use client";

import dynamic from 'next/dynamic';

const UserCategoryEdit = dynamic(() => import('@simplycms/admin/pages/UserCategoryEdit'), { ssr: false });

export default function Page() {
  return <UserCategoryEdit />;
}
