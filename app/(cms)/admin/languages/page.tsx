'use client';

import dynamic from 'next/dynamic';

const PlaceholderPage = dynamic(
  () => import('@simplycms/admin/pages/PlaceholderPage'),
  { ssr: false },
);

export default function Page() {
  return <PlaceholderPage />;
}
