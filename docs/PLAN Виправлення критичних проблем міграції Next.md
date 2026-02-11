# Plan: Виправлення критичних проблем міграції Next.js

## Контекст

За результатами code review виявлено, що:
- **Default тема** в новому проекті — це фактично перенесена **beauty** тема з референсу
- Оригінальна **SolarStore Default** тема (яка є обгорткою навколо основних SPA-сторінок) — **не перенесена**
- 15 core pages залишились заглушками (Catalog, ProductDetail, Cart, Checkout та ін.)
- SSR-first концепція порушена через `"use client"` на storefront layout
- Supabase client дублюється в 11 файлах

---

## Архітектура агентів

Завдання розбито на **6 незалежних блоків**, які можуть виконуватись паралельно де можливо.

---

## БЛОК 1: SSR-first архітектура (Critical)

### Мета
Виправити порушення SSR-first концепції, щоб публічні сторінки рендерились на сервері.

### Завдання

#### 1.1 Зробити `app/(storefront)/layout.tsx` Server Component

**Файл:** `app/(storefront)/layout.tsx`

**Поточний стан:**
```tsx
"use client";
import { MainLayout } from "@themes/default/layouts/MainLayout";
export default function StorefrontLayout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}
```

**Цільовий стан:**
```tsx
// БЕЗ "use client" — Server Component
import { StorefrontShell } from "@themes/default/layouts/StorefrontShell";

export default function StorefrontLayout({ children }) {
  return <StorefrontShell>{children}</StorefrontShell>;
}
```

**Що потрібно зробити:**
1. Видалити `"use client"` з `app/(storefront)/layout.tsx`
2. Створити в темі **два компоненти** замість одного MainLayout:
   - `StorefrontShell` — Server Component (обгортка з div та className)
   - `ClientHeader` — Client Component (Header з useAuth, useCart)
   - `ClientFooter` — Client Component (Footer з useThemeSettings)
3. Адаптувати `themes/default/layouts/MainLayout.tsx`:
   - Винести Header/Footer як окремі client-side компоненти (вони вже є)
   - Створити серверну обгортку без `useEffect` та `"use client"`

**Новий файл `themes/default/layouts/StorefrontShell.tsx`:**
```tsx
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
```

> **Примітка:** Header та Footer вже мають `"use client"`, тому вони можуть імпортуватись з Server Component — Next.js це підтримує.

#### 1.2 Виправити SSR storefront pages — інтеграція з темою

**Файли:** 6 SSR-сторінок в `app/(storefront)/`

Поточні сторінки каталогу/товару отримують дані на сервері, але рендерять примітивний UI замість компонентів теми.

**Підхід:** SSR pages передають серверні дані як props в client-side компоненти теми.

**Приклад для `app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx`:**
```tsx
import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import ProductPageClient from '@themes/default/pages/ProductPage';

export const revalidate = 3600;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  // ... існуючий код metadata (залишити)
}

export default async function ProductPage({ params }: Props) {
  const { productSlug } = await params;
  const supabase = await createServerSupabaseClient();

  const { data: product } = await supabase
    .from('products')
    .select('*, sections(*), product_modifications(...)')
    .eq('slug', productSlug)
    .maybeSingle();

  if (!product) notFound();

  // Передати серверні дані в клієнтський компонент теми
  return <ProductPageClient product={product} />;
}
```

**Таблиця змін для кожної SSR-сторінки:**

| Файл | SSR data | Theme component | Props |
|------|----------|-----------------|-------|
| `(storefront)/page.tsx` | banners, featured, new products | `HomePage` | `{banners, featuredProducts, newProducts, sections}` |
| `catalog/page.tsx` | sections, products | `CatalogPage` | `{sections, initialProducts}` |
| `catalog/[sectionSlug]/page.tsx` | section, products | `CatalogSectionPage` | `{section, sections, initialProducts}` |
| `catalog/[sectionSlug]/[productSlug]/page.tsx` | product | `ProductPage` | `{product}` |
| `properties/page.tsx` | properties | `PropertiesPage` | `{properties}` |
| `properties/[propertySlug]/page.tsx` | property, options | `PropertyDetailPage` | `{property, options}` |
| `properties/[propertySlug]/[optionSlug]/page.tsx` | property, option, products | `PropertyOptionPage` | `{property, option, products}` |

#### 1.3 Зробити HomePage SSR-capable

**Файл:** `themes/default/pages/HomePage.tsx`

**Поточний стан:** 144 рядки з `"use client"` та 3x useQuery
**Цільовий стан:** Приймає серверні дані через props, useQuery для оновлення в реальному часі

```tsx
"use client";

interface HomePageProps {
  banners?: any[];
  featuredProducts?: Product[];
  newProducts?: Product[];
  sections?: Section[];
}

export default function HomePage({
  banners, featuredProducts, newProducts, sections
}: HomePageProps) {
  // useQuery з initialData для client-side refresh
  const { data: featured } = useQuery({
    queryKey: ["featured-products"],
    queryFn: async () => { /* ... */ },
    initialData: featuredProducts, // SSR дані як початкові
  });
  // ...
}
```

**SSR data fetching в `app/(storefront)/page.tsx`:**
```tsx
// app/(storefront)/page.tsx — Server Component
import { createServerSupabaseClient } from '@simplycms/core/supabase/server';
import HomePage from '@themes/default/pages/HomePage';

export const revalidate = 3600;

export default async function Home() {
  const supabase = await createServerSupabaseClient();

  const [banners, featured, newProducts, sections] = await Promise.all([
    supabase.from('banners').select('*').eq('is_active', true),
    supabase.from('products').select('...').eq('is_featured', true).limit(12),
    supabase.from('products').select('...').order('created_at', {ascending: false}).limit(12),
    supabase.from('sections').select('id, name, slug').is('parent_id', null),
  ]);

  return (
    <HomePage
      banners={banners.data || []}
      featuredProducts={featured.data || []}
      newProducts={newProducts.data || []}
      sections={sections.data || []}
    />
  );
}
```

---

## БЛОК 2: Реалізація Core Pages (Critical)

### Мета
Перенести функціонал з 15 reference pages (`temp/src/pages/`) у `packages/simplycms/core/src/pages/`.

### Принципи переносу
1. **Замінити React Router** → Next.js:
   - `useNavigate()` → `useRouter()` з `next/navigation`
   - `<Link to="/">` → `<Link href="/">`
   - `useParams()` → props або `useParams()` з `next/navigation`
   - `useSearchParams()` → `useSearchParams()` з `next/navigation`
2. **Зберегти всі компоненти та хуки** — вони вже перенесені в core
3. **Залишити `"use client"`** — ці pages є клієнтськими компонентами

### Завдання по файлах

#### 2.1 Catalog.tsx (591 → ~580 рядків)
**Джерело:** `temp/src/pages/Catalog.tsx`
**Ціль:** `packages/simplycms/core/src/pages/Catalog.tsx`

**Ключові зміни:**
- `import { Link, useNavigate } from 'react-router-dom'` → `import Link from 'next/link'` + `import { useRouter } from 'next/navigation'`
- `navigate("/path")` → `router.push("/path")`
- `<Link to="/catalog">` → `<Link href="/catalog">`
- Додати optional props `initialProducts`, `initialSections` для SSR hydration

**Компоненти, що використовуються (вже перенесені):**
- `ProductCard`, `FilterSidebar`, `ActiveFilters` (з `@simplycms/core`)
- `usePriceType`, `useDiscountGroups`, `useProductRatings` (з `@simplycms/core`)
- `resolvePrice`, `applyDiscount`, `fetchModificationStockData` (з `@simplycms/core`)
- `Badge`, `Button`, `Select`, `Sheet` (з `@simplycms/ui`)

#### 2.2 CatalogSection.tsx (627 → ~620 рядків)
**Джерело:** `temp/src/pages/CatalogSection.tsx`
**Ціль:** `packages/simplycms/core/src/pages/CatalogSection.tsx`

**Ключові зміни:** аналогічні Catalog.tsx + props `{sectionSlug}` замість `useParams()`

#### 2.3 ProductDetail.tsx (576 → ~570 рядків)
**Джерело:** `temp/src/pages/ProductDetail.tsx`
**Ціль:** `packages/simplycms/core/src/pages/ProductDetail.tsx`

**Ключові зміни:**
- `useParams()` → props `{productSlug, sectionSlug}` або `useParams()` з next/navigation
- `useSearchParams()` → `useSearchParams()` з next/navigation
- `setSearchParams({mod: slug})` → `router.replace(pathname + '?mod=' + slug)`
- `<Link to="/">` → `<Link href="/">`

**Компоненти (вже перенесені):**
- `ProductGallery`, `ModificationSelector`, `StockDisplay`, `ProductCharacteristics`
- `ProductReviews`, `StarRating`, `PluginSlot`
- `useCart`, `usePriceType`, `useDiscountGroups`, `resolvePrice`, `applyDiscount`

#### 2.4 Cart.tsx (114 → ~110 рядків)
**Джерело:** `temp/src/pages/Cart.tsx`
**Ціль:** `packages/simplycms/core/src/pages/Cart.tsx`

**Ключові зміни:**
- `<Link to="/catalog">` → `<Link href="/catalog">`
- `<Link to="/checkout">` → `<Link href="/checkout">`

#### 2.5 Checkout.tsx (352 → ~345 рядків)
**Джерело:** `temp/src/pages/Checkout.tsx`
**Ціль:** `packages/simplycms/core/src/pages/Checkout.tsx`

**Ключові зміни:**
- `useNavigate()` → `useRouter()`
- `navigate(\`/order-success/${id}\`)` → `router.push(\`/order-success/${id}\`)`

#### 2.6 Auth.tsx (461 → ~455 рядків)
**Джерело:** `temp/src/pages/Auth.tsx`
**Ціль:** `packages/simplycms/core/src/pages/Auth.tsx`

**Ключові зміни:**
- `useNavigate()` → `useRouter()`
- `useSearchParams()` → `useSearchParams()` з next/navigation
- `navigate("/")` → `router.push("/")`
- OAuth redirect URL: `window.location.origin + "/auth/callback"`

#### 2.7 Profile.tsx (217 рядків)
**Джерело:** `temp/src/pages/Profile.tsx`
**Ціль:** `packages/simplycms/core/src/pages/Profile.tsx`

#### 2.8 ProfileOrders.tsx (231 рядків)
**Джерело:** `temp/src/pages/ProfileOrders.tsx`
**Ціль:** `packages/simplycms/core/src/pages/ProfileOrders.tsx`

#### 2.9 ProfileOrderDetail.tsx (441 рядків)
**Джерело:** `temp/src/pages/ProfileOrderDetail.tsx`
**Ціль:** `packages/simplycms/core/src/pages/ProfileOrderDetail.tsx`

**Ключові зміни:**
- `useParams()` → props `{orderId}` або `useParams()` з next/navigation
- `useNavigate()` → `useRouter()`
- `navigate(-1)` → `router.back()`

#### 2.10 ProfileSettings.tsx (333 рядків)
**Джерело:** `temp/src/pages/ProfileSettings.tsx`
**Ціль:** `packages/simplycms/core/src/pages/ProfileSettings.tsx`

#### 2.11 OrderSuccess.tsx (301 рядків)
**Джерело:** `temp/src/pages/OrderSuccess.tsx`
**Ціль:** `packages/simplycms/core/src/pages/OrderSuccess.tsx`

**Ключові зміни:**
- `useParams()` → props `{orderId}` або `useParams()` з next/navigation
- `useSearchParams()` → `useSearchParams()` з next/navigation (для token)

#### 2.12 Properties.tsx (104 рядків)
**Джерело:** `temp/src/pages/Properties.tsx`
**Ціль:** `packages/simplycms/core/src/pages/Properties.tsx`

#### 2.13 PropertyDetail.tsx (124 рядків)
**Джерело:** `temp/src/pages/PropertyDetail.tsx`
**Ціль:** `packages/simplycms/core/src/pages/PropertyDetail.tsx`

#### 2.14 PropertyPage.tsx (226 рядків)
**Джерело:** `temp/src/pages/PropertyPage.tsx`
**Ціль:** `packages/simplycms/core/src/pages/PropertyPage.tsx`

#### 2.15 NotFound.tsx (24 рядків)
**Джерело:** `temp/src/pages/NotFound.tsx`
**Ціль:** `packages/simplycms/core/src/pages/NotFound.tsx`

---

## БЛОК 3: Усунення дублювання Supabase та архітектурні виправлення (Major)

### Мета
Усунути copy-paste Supabase client, підключити middleware до core helper, реалізувати `defineConfig`.

### Завдання

#### 3.1 Замінити inline `createSupabase()` на `createServerSupabaseClient()`

**11 файлів для виправлення:**
1. `app/(storefront)/catalog/page.tsx`
2. `app/(storefront)/catalog/[sectionSlug]/page.tsx`
3. `app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx`
4. `app/(storefront)/properties/page.tsx`
5. `app/(storefront)/properties/[propertySlug]/page.tsx`
6. `app/(storefront)/properties/[propertySlug]/[optionSlug]/page.tsx`
7. `app/(protected)/layout.tsx`
8. `app/auth/callback/route.ts`
9. `app/api/guest-order/route.ts`
10. `app/api/health/route.ts`
11. `app/sitemap.ts`

**Зміна в кожному файлі:**
```diff
- import { createServerClient } from '@supabase/ssr';
- import { cookies } from 'next/headers';
-
- async function createSupabase() {
-   const cookieStore = await cookies();
-   return createServerClient(
-     process.env.NEXT_PUBLIC_SUPABASE_URL!,
-     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
-     { cookies: { getAll: () => cookieStore.getAll(), setAll: ... } }
-   );
- }
+ import { createServerSupabaseClient } from '@simplycms/core/supabase/server';

// Далі замінити createSupabase() → createServerSupabaseClient()
```

#### 3.2 Middleware — використовувати core helper

**Файл:** `middleware.ts`

**Зміна:**
```diff
- import { createServerClient } from '@supabase/ssr';
+ import { createMiddlewareSupabaseClient } from '@simplycms/core/supabase/middleware';

export async function middleware(request: NextRequest) {
-   let supabaseResponse = NextResponse.next({ request });
-   const supabase = createServerClient(...);
+   const { supabase, response: supabaseResponse } = await createMiddlewareSupabaseClient(request);
    // ... решта логіки залишається
}
```

#### 3.3 Реалізувати `defineConfig()` в core

**Новий файл:** `packages/simplycms/core/src/config.ts`

```tsx
import type { SimplyCMSConfig } from './types/config';

export function defineConfig(config: SimplyCMSConfig): SimplyCMSConfig {
  return {
    ...config,
    supabase: {
      url: config.supabase?.url || process.env.NEXT_PUBLIC_SUPABASE_URL!,
      anonKey: config.supabase?.anonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    },
  };
}
```

**Оновити `simplycms.config.ts`:**
```tsx
import { defineConfig } from '@simplycms/core/config';
import defaultTheme from './themes/default';

export default defineConfig({
  theme: defaultTheme,
  plugins: [],
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },
  seo: { siteName: 'SimplyCMS Store', defaultTitle: '...', titleTemplate: '%s | ...' },
  locale: 'uk-UA',
  currency: 'UAH',
});
```

#### 3.4 Виправити Revalidation API

**Файл:** `app/api/revalidate/route.ts`

Реалізувати каскадну ревалідацію за BRD:

```tsx
import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { secret, type, slug, sectionSlug, path } = await request.json();

    if (secret !== process.env.REVALIDATION_SECRET) {
      return NextResponse.json({ message: 'Invalid secret' }, { status: 401 });
    }

    const revalidated: string[] = [];

    if (type === 'product' && slug && sectionSlug) {
      revalidatePath(`/catalog/${sectionSlug}/${slug}`);
      revalidatePath(`/catalog/${sectionSlug}`);
      revalidatePath('/catalog');
      revalidated.push(`/catalog/${sectionSlug}/${slug}`, `/catalog/${sectionSlug}`, '/catalog');
    } else if (type === 'section' && slug) {
      revalidatePath(`/catalog/${slug}`);
      revalidatePath('/catalog');
      revalidated.push(`/catalog/${slug}`, '/catalog');
    } else if (type === 'banner') {
      revalidatePath('/');
      revalidated.push('/');
    } else if (path) {
      revalidatePath(path);
      revalidated.push(path);
    }

    return NextResponse.json({ revalidated: true, paths: revalidated, now: Date.now() });
  } catch {
    return NextResponse.json({ message: 'Error revalidating' }, { status: 500 });
  }
}
```

---

## БЛОК 4: SolarStore тема (New)

### Мета
Перенести оригінальну "SolarStore Default" тему, яка є обгорткою основних SPA-сторінок з іншим дизайном.

### Контекст
У референсі (`temp/src/themes/default/`):
- Тема називається "SolarStore Default"
- Має синю кольорову палітру (`#1192DC`)
- Підтримує dark mode та grid/list layouts
- Має власний header з категоріями (Batteries, Inverters, Solar Panels)
- Re-exports core pages (після міграції core pages будуть готові)

### Завдання

#### 4.1 Створити структуру `themes/solarstore/`

```
themes/solarstore/
├── package.json
├── manifest.ts
├── index.ts
├── layouts/
│   ├── MainLayout.tsx          # з Header/Footer Solar Store
│   ├── CatalogLayout.tsx
│   └── ProfileLayout.tsx
├── components/
│   ├── Header.tsx              # Solar Store header (синя палітра, іконки категорій)
│   └── Footer.tsx              # Solar Store footer
├── pages/
│   ├── HomePage.tsx            # Перенести з temp/src/pages/Index.tsx (272 рядки)
│   ├── CatalogPage.tsx         # Re-export з core (фільтри вже в core)
│   ├── CatalogSectionPage.tsx
│   ├── ProductPage.tsx
│   ├── CartPage.tsx
│   ├── CheckoutPage.tsx
│   ├── OrderSuccessPage.tsx
│   ├── AuthPage.tsx
│   ├── ProfilePage.tsx
│   ├── ProfileOrdersPage.tsx
│   ├── ProfileOrderDetailPage.tsx
│   ├── ProfileSettingsPage.tsx
│   ├── PropertiesPage.tsx
│   ├── PropertyDetailPage.tsx
│   ├── PropertyOptionPage.tsx
│   └── NotFoundPage.tsx
└── styles/
    └── theme.css               # Сині CSS variables
```

#### 4.2 Перенести SolarStore Header/Footer

**Джерело:** `temp/src/pages/Index.tsx` (header з навігацією, hero, footer — все в одному файлі)

**Що виділити:**
- Header: навігація з категоріями (Battery, Zap, Sun, Wrench іконки), auth dropdown, cart
- Footer: SolarStore branding, links
- Hero section: стане частиною HomePage

#### 4.3 Manifest та конфігурація

```tsx
// themes/solarstore/manifest.ts
const manifest = {
  name: 'solarstore',
  displayName: 'SolarStore Default',
  version: '1.0.0',
  description: 'Стандартна тема SolarStore з підтримкою світлої/темної теми',
  author: 'SolarStore Team',
  supports: { darkMode: true, customColors: true },
  settings: [
    { key: 'primaryColor', type: 'color', default: '#1192DC', label: 'Основний колір' },
    { key: 'showBrandInHeader', type: 'boolean', default: true, label: 'Показувати логотип у хедері' },
    { key: 'productsPerRow', type: 'select', default: '4', label: 'Товарів у рядку' },
  ],
};
export default manifest;
```

#### 4.4 Тема CSS variables

```css
/* themes/solarstore/styles/theme.css */
.solarstore-theme {
  --primary: 203 85% 47%;       /* #1192DC */
  --primary-foreground: 0 0% 100%;
  /* ... решта змінних зі стилю Solar Store */
}
```

#### 4.5 Зареєструвати тему

**Файл:** `app/providers.tsx`
```diff
+ if (!ThemeRegistry.has("solarstore")) {
+   ThemeRegistry.register("solarstore", () =>
+     import("@themes/solarstore/index").then((m) => ({ default: m.default }))
+   );
+ }
```

---

## БЛОК 5: Оптимізація зображень та SEO (Major)

### Мета
Замінити `<img>` на `next/image`, додати Schema.org structured data.

### Завдання

#### 5.1 Замінити `<img>` на `next/image`

**Файли для зміни:**

| Файл | `<img>` тегів | Зміна |
|------|---------------|-------|
| `themes/default/components/Header.tsx` | 1 (логотип) | `next/image` з priority |
| `themes/default/components/Footer.tsx` | 1 (логотип) | `next/image` |
| `themes/default/components/ProductCard.tsx` | 1 (товар) | `next/image` з sizes |
| `themes/default/components/BannerSlider.tsx` | ~2 (банери) | `next/image` з fill |
| `core/components/catalog/ProductCard.tsx` | 1 | `next/image` |
| `core/components/catalog/ProductGallery.tsx` | ~N | `next/image` |
| `core/components/profile/AvatarUpload.tsx` | 1 | `next/image` |
| `admin/components/ImageUpload.tsx` | ~N | залишити `<img>` (адмін) |

**Приклад зміни ProductCard:**
```diff
- <img
-   src={firstImage}
-   alt={product.name}
-   className="w-full h-full object-cover"
- />
+ import Image from "next/image";
+ <Image
+   src={firstImage}
+   alt={product.name}
+   fill
+   sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
+   className="object-cover"
+ />
```

#### 5.2 Додати Schema.org JSON-LD для товарів

**Файл:** `app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx`

Додати в SSR Server Component:

```tsx
import { type WithContext, type Product as SchemaProduct } from 'schema-dml';

// В кінці компонента, після даних з БД:
const jsonLd: WithContext<SchemaProduct> = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.description,
  image: product.images,
  offers: {
    '@type': 'Offer',
    price: product.price,
    priceCurrency: 'UAH',
    availability: product.stock_status === 'in_stock'
      ? 'https://schema.org/InStock'
      : 'https://schema.org/OutOfStock',
  },
};

return (
  <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    <ProductPageClient product={product} />
  </>
);
```

---

## БЛОК 6: Виправлення артефактів та мінорні проблеми (Medium)

### Завдання

#### 6.1 Виправити cart storage key
**Файл:** `packages/simplycms/core/src/hooks/useCart.tsx`
```diff
- const CART_STORAGE_KEY = "solarstore-cart";
+ const CART_STORAGE_KEY = "simplycms-cart";
```

#### 6.2 Виправити query key prefix
**Файли:** `themes/default/pages/HomePage.tsx`, `themes/default/components/Header.tsx`
```diff
- queryKey: ["beauty-featured-products"]
+ queryKey: ["featured-products"]
- queryKey: ["beauty-new-products"]
+ queryKey: ["new-products"]
- queryKey: ["beauty-root-sections"]
+ queryKey: ["root-sections"]
- queryKey: ["beauty-sections-nav"]
+ queryKey: ["sections-nav"]
- queryKey: ["beauty-section-products", section.id]
+ queryKey: ["section-products", section.id]
```

#### 6.3 Виправити QueryClient singleton

**Файл:** `packages/simplycms/core/src/providers/CMSProvider.tsx`
```diff
+ import { useState } from "react";

- const queryClient = new QueryClient({...});

export function CMSProvider({ children, customQueryClient }: CMSProviderProps) {
-   const client = customQueryClient || queryClient;
+   const [client] = useState(() => customQueryClient || new QueryClient({
+     defaultOptions: {
+       queries: { staleTime: 5 * 60 * 1000, retry: 1 },
+     },
+   }));
```

#### 6.4 Замінити `setTimeout` на `queueMicrotask` в useAuth

**Файл:** `packages/simplycms/core/src/hooks/useAuth.tsx`
```diff
-         setTimeout(async () => {
+         queueMicrotask(async () => {
```

---

## ПОРЯДОК ВИКОНАННЯ (Паралелізація)

```
┌───────────────────────────────────────────────────────────┐
│ ПАРАЛЕЛЬНИЙ БЛОК A (незалежні)                            │
│                                                           │
│  Агент 1: БЛОК 2 — Core Pages Migration (15 файлів)      │
│           Найбільший обсяг: ~4500 рядків коду             │
│           Може працювати незалежно                        │
│                                                           │
│  Агент 2: БЛОК 4 — SolarStore Theme Creation              │
│           ~500-600 рядків нового коду                      │
│           Може працювати незалежно                        │
│                                                           │
│  Агент 3: БЛОК 6 — Артефакти та мінорні фікси            │
│           Прості точкові зміни                            │
│           Може працювати незалежно                        │
└───────────────────────────────────────────────────────────┘
              │
              ▼ (після завершення БЛОК 2)
┌───────────────────────────────────────────────────────────┐
│ ПОСЛІДОВНИЙ БЛОК B (залежить від БЛОК 2)                   │
│                                                           │
│  Агент 4: БЛОК 1 — SSR-first Architecture                 │
│           Залежить від готових core pages                  │
│           Підключення theme pages до SSR flow             │
│                                                           │
│  Агент 5: БЛОК 3 — Supabase/Middleware/Config              │
│           Може після БЛОК 1 (SSR pages використовують     │
│           createServerSupabaseClient)                      │
└───────────────────────────────────────────────────────────┘
              │
              ▼ (після завершення БЛОКІВ 1-4)
┌───────────────────────────────────────────────────────────┐
│ ФІНАЛЬНИЙ БЛОК C                                          │
│                                                           │
│  Агент 6: БЛОК 5 — next/image + Schema.org                │
│           Залежить від фінальної структури компонентів    │
│           Виконується останнім                            │
└───────────────────────────────────────────────────────────┘
```

---

## ОЦІНКА ОБСЯГУ

| Блок | Рядків коду | Файлів | Складність | Пріоритет |
|------|-------------|--------|------------|-----------|
| БЛОК 1: SSR Architecture | ~200 змін | 8 | High | Critical |
| БЛОК 2: Core Pages | ~4500 нових | 15 | High | Critical |
| БЛОК 3: Supabase/Config | ~150 змін | 14 | Medium | Major |
| БЛОК 4: SolarStore Theme | ~600 нових | 12 | Medium | Major |
| БЛОК 5: Images/SEO | ~100 змін | 8 | Low | Major |
| БЛОК 6: Artifacts | ~20 змін | 5 | Low | Medium |
| **РАЗОМ** | **~5570** | **62** | | |
