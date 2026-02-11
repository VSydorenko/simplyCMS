"use client";

import { MainLayout } from "@themes/default/layouts/MainLayout";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
