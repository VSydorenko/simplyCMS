import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Авторизація | SolarStore',
  description: 'Вхід або реєстрація в інтернет-магазині SolarStore',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
