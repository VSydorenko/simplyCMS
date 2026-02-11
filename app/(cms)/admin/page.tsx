"use client";

import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('@simplycms/admin/pages/Dashboard'), { ssr: false });

export default function Page() {
  return <Dashboard />;
}
