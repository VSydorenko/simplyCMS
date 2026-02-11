"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { User, Package, Settings, LogOut } from "lucide-react";
import { cn } from "@simplycms/core/lib/utils";
import { useAuth } from "@simplycms/core/hooks/useAuth";
import { Button } from "@simplycms/ui/button";
import { Skeleton } from "@simplycms/ui/skeleton";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

const navItems = [
  { href: "/profile", icon: User, label: "Профіль", exact: true },
  { href: "/profile/orders", icon: Package, label: "Мої замовлення" },
  { href: "/profile/settings", icon: Settings, label: "Налаштування" },
];

export function ProfileLayout({ children }: { children?: React.ReactNode }) {
  const { user, isLoading, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    document.documentElement.classList.add("default-theme");
    return () => {
      document.documentElement.classList.remove("default-theme");
    };
  }, []);

  if (isLoading) {
    return (
      <div className="default-theme min-h-screen bg-[hsl(var(--background))] flex flex-col">
        <Header />
        <div className="container mx-auto px-4 py-8 flex-1">
          <div className="flex gap-8">
            <div className="w-64 space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="flex-1"><Skeleton className="h-64 w-full" /></div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!user) {
    router.push("/auth");
    return null;
  }

  return (
    <div className="default-theme min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <Header />
      <div className="container mx-auto px-4 py-8 flex-1">
        <div className="flex flex-col md:flex-row gap-8">
          <aside className="w-full md:w-64 shrink-0">
            <nav className="space-y-1">
              {navItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-md text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                );
              })}
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 px-4 py-3 h-auto text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={signOut}
              >
                <LogOut className="h-5 w-5" />
                Вийти
              </Button>
            </nav>
          </aside>
          <main className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
      <Footer />
    </div>
  );
}
