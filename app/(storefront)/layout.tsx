// Server Component — БЕЗ "use client"
// Гарантія реєстрації тем на сервері
import "@/theme-registry.server";
import { getActiveThemeSSR } from "@simplycms/themes";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const { theme } = await getActiveThemeSSR();
  const Layout = theme.MainLayout;

  return <Layout>{children}</Layout>;
}
