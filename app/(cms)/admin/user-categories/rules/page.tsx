"use client";

import dynamic from 'next/dynamic';

const UserCategoryRules = dynamic(() => import('@simplycms/admin/pages/UserCategoryRules'), { ssr: false });

export default function Page() {
  return <UserCategoryRules />;
}
