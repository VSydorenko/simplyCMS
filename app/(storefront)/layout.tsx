// Server Component — БЕЗ "use client"
import { StorefrontShell } from "@themes/default/layouts/StorefrontShell";

export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
