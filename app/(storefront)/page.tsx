import type { Metadata } from 'next';
import ThemeHomePage from '@themes/default/pages/HomePage';

export const metadata: Metadata = {
  title: 'Головна',
  description: 'SimplyCMS Store — інтернет-магазин',
};

export default function HomePage() {
  return <ThemeHomePage />;
}
