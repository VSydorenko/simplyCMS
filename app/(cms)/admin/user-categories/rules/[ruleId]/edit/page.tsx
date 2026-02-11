"use client";

import dynamic from 'next/dynamic';

const UserCategoryRuleEdit = dynamic(() => import('@simplycms/admin/pages/UserCategoryRuleEdit'), { ssr: false });

export default function Page() {
  return <UserCategoryRuleEdit />;
}
