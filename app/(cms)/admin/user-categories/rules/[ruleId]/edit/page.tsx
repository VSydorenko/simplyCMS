"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const UserCategoryRuleEdit = dynamic(() => import('@simplycms/admin/pages/UserCategoryRuleEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <UserCategoryRuleEdit id={params.ruleId as string} />;
}
