---
applyTo: '**/*.ts,**/*.tsx'
description: 'Правила оптимізації для SimplyCMS'
---

# Performance Optimization

## SSR & ISR (Storefront)

- **ISR revalidation** для каталогу та товарних сторінок (1800s-3600s).
- On-demand revalidation через `/api/revalidate` після змін в адмінці.
- `next/image` для всіх зображень на storefront (lazy loading, optimization).
- `next/font` для шрифтів (Inter з cyrillic subset).
- Schema.org structured data для товарних сторінок (SEO).

## React Query & Caching (Admin)

- TanStack React Query для client-side caching в адмінці.
- Правильні `staleTime` для різних типів даних:
  - Довідники (статуси, типи цін): `staleTime: 5 * 60 * 1000` (5 хв)
  - Списки товарів/замовлень: `staleTime: 30 * 1000` (30 сек)
- Після мутацій — **invalidation** відповідних query keys.
- Стабільні `queryKey` між компонентами.

## Bundle Optimization

- **Dynamic imports** для важких компонентів:
  - Tiptap editor: `next/dynamic` з `ssr: false`
  - Recharts: `next/dynamic` з `ssr: false`
- Tree shaking через правильні exports у packages.
- `transpilePackages` в `next.config.ts` для workspace packages.

## Database

- Pagination для списків > 50 записів.
- **Debounce** 300ms для пошуку та фільтрів.
- Використовуй `.select()` з конкретними полями замість `select('*')` де можливо.
- RLS policies для фільтрації на рівні бази.

## Error Handling

- **Error Boundaries** (`app/error.tsx`) для React компонентів.
- Try-catch для всіх Supabase операцій.
- `loading.tsx` для глобального loading стану.
- Graceful degradation при недоступності Supabase.

## Server Components vs Client Components

- Server Components за замовчуванням (менший bundle, SEO).
- `'use client'` лише для інтерактивних елементів:
  - Кошик (useCart, localStorage)
  - Фільтри каталогу
  - Форми (react-hook-form)
  - Карусель (Embla)
  - Все в адмін-панелі
- `suppressHydrationWarning` для елементів з різним SSR/client рендером (dark mode, cart count).
