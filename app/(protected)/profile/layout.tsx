"use client";

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-fluid py-8">
      <div className="flex gap-8">
        <nav className="w-64 shrink-0">
          <h2 className="text-lg font-semibold mb-4">Profile</h2>
          <ul className="space-y-2">
            <li><a href="/profile" className="text-sm hover:underline">Overview</a></li>
            <li><a href="/profile/orders" className="text-sm hover:underline">My Orders</a></li>
            <li><a href="/profile/settings" className="text-sm hover:underline">Settings</a></li>
          </ul>
        </nav>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
