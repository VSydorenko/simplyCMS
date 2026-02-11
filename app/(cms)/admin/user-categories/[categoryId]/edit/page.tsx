"use client";

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';

const UserCategoryEdit = dynamic(() => import('@simplycms/admin/pages/UserCategoryEdit'), { ssr: false });

export default function Page() {
  const params = useParams();
  return <UserCategoryEdit id={params.categoryId as string} />;
}
