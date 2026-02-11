// Server Component — БЕЗ "use client"
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

export function StorefrontShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="default-theme min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
