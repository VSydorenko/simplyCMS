"use client";

import { Loader2 } from "lucide-react";

/** Стан завантаження для адмін-панелі при навігації між сторінками */
export default function AdminLoading() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
