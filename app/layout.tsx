import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { Toaster as SonnerToaster } from 'sonner';
import { Toaster } from '@simplycms/ui/toaster';
import { Providers } from './providers';
import './globals.css';
// Гарантія реєстрації тем на сервері (для SSR resolver)
import './theme-registry.server';
import { getActiveThemeSSR } from '@simplycms/themes';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: { default: 'SimplyCMS Store', template: '%s | SimplyCMS Store' },
  description: 'SimplyCMS — open-source e-commerce CMS platform',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Отримуємо активну тему (кешовано через unstable_cache)
  let initialThemeName: string | undefined;
  let initialThemeSettings: Record<string, unknown> | undefined;
  try {
    const { themeName, themeRecord } = await getActiveThemeSSR();
    initialThemeName = themeName;
    initialThemeSettings = themeRecord.settings;
  } catch {
    // Fallback: ThemeContext зробить fetch самостійно
  }

  return (
    <html lang="uk" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Providers
            initialThemeName={initialThemeName}
            initialThemeSettings={initialThemeSettings}
          >
            {children}
          </Providers>
          <Toaster />
          <SonnerToaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
