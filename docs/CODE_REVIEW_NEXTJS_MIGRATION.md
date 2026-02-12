# Code Review: Next.js Migration (Vite SPA -> Next.js SSR-first)

**Рев'юер:** Claude AI
**Дата:** 2026-02-11
**BRD документ:** BRD_SIMPLYCMS_NEXTJS.md
**Гілка:** claude/nextjs-migration-review-rlZzW

---

## Загальний вердикт

| Категорія | Оцінка | Коментар |
|-----------|--------|----------|
| Структура проекту | **8/10** | Відповідає BRD, monorepo workspace коректний |
| SSR-first реалізація | **3/10** | Критичні порушення концепції |
| Перенесення функціоналу | **4/10** | 15 з 15 core pages — заглушки |
| Адмін-панель | **9/10** | Повністю реалізована (58 сторінок, 11500+ рядків) |
| Система тем | **8/10** | Повна реалізація, відповідає контракту |
| Система плагінів | **9/10** | Повна реалізація, покращена відносно референсу |
| Автентифікація/Middleware | **7/10** | Працює, але є архітектурні зауваження |
| Конфігурація/Build | **6/10** | Неповна відповідність BRD |

**Загальна оцінка: 5.5/10** — Інфраструктура створена якісно, але публічна частина магазину (storefront) залишилась незавершеною.

---

## 1. КРИТИЧНІ ПРОБЛЕМИ (Severity: Critical)

### 1.1 SSR-first концепція порушена для storefront

**BRD вимога (Секція 9):** Публічні сторінки мають рендеритись на сервері для SEO та швидкості.

**Факт:** Storefront layout оголошений як `"use client"`:

```typescript
// app/(storefront)/layout.tsx — ПРОБЛЕМА
"use client";
import { MainLayout } from "@themes/default/layouts/MainLayout";
export default function StorefrontLayout({ children }: { children: React.ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
```

**Наслідки:**
- Весь `(storefront)` route group стає client-side rendered
- Server Components всередині (catalog, product pages) втрачають можливість SSR
- `generateMetadata()` на SSR-сторінках може працювати некоректно
- SEO-оптимізація для crawler-ів значно погіршується
- Весь data fetching через `async function` в page.tsx стає безглуздим, бо parent layout вже client

**BRD очікування:**
```
app/(storefront)/layout.tsx → MainLayout з теми (Server Component)
```

### 1.2 Всі 15 core pages — заглушки (stubs)

**BRD вимога (Додаток A):** Перенести функціонал із `temp/src/pages/` в відповідні пакети.

**Факт:** Кожна сторінка в `packages/simplycms/core/src/pages/` — це 5-рядкова заглушка:

| Файл | Код | Рядків в референсі |
|------|-----|---------------------|
| `Catalog.tsx` | `return <div>Catalog</div>` | 591 |
| `ProductDetail.tsx` | `return <div>Product Detail</div>` | 576 |
| `Checkout.tsx` | `return <div>Checkout</div>` | 352 |
| `Profile.tsx` | `return <div>Profile</div>` | 217 |
| `Cart.tsx` | `return <div>Cart</div>` | ~200 |
| `Auth.tsx` | `return <div>Auth</div>` | ~150 |
| + ще 9 сторінок | Заглушки | ~1500+ |

**Загалом ~3500+ рядків функціоналу з референсу не перенесено.**

Це означає що:
- **Каталог** не має фільтрів, сортування, сітки товарів, ціноутворення
- **Картка товару** не має модифікацій, характеристик, відгуків, кнопки "В кошик"
- **Кошик** не функціональний
- **Checkout** не має форм замовлення
- **Профіль** не відображає дані користувача, замовлення

### 1.3 Storefront SSR pages не використовують тему

**BRD вимога (Секція 7.2):**
```typescript
// Очікується в app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx
const theme = await getActiveTheme();
const { ProductPage: ThemedProductPage } = theme.pages;
return <ThemedProductPage product={product} />;
```

**Факт:** SSR сторінки каталогу отримують дані, але рендерять примітивний UI замість компонентів теми:

```typescript
// app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx — ПРОБЛЕМА
return (
  <div className="container-fluid py-8">
    <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
    <p className="text-sm text-muted-foreground">
      {product.product_modifications?.length || 0} modifications available
    </p>
  </div>
);
```

Дані з серверу отримуються, але **не передаються в компонент теми** і **не рендеряться належним чином**.

### 1.4 HomePage — client-side замість SSR

**BRD вимога (Секція 9.1):** Головна сторінка — SSR з revalidate 3600s.

**Факт:** `themes/default/pages/HomePage.tsx` — `"use client"` з useQuery для завантаження даних:

```typescript
// HomePage.tsx — 144 рядки, повністю client-side
"use client";
const { data: featuredProducts } = useQuery({...});
const { data: newProducts } = useQuery({...});
const { data: rootSections } = useQuery({...});
```

Це означає:
- Не SSR, а client-side data fetching
- Пошукові роботи бачать порожню сторінку
- Немає revalidation стратегії
- Порушує ключовий принцип SSR-first

---

## 2. СЕРЙОЗНІ ПРОБЛЕМИ (Severity: Major)

### 2.1 Дублювання createSupabase() в кожному SSR-файлі

**BRD вимога:** Використовувати `createServerSupabaseClient()` з `@simplycms/core/supabase/server`.

**Факт:** 11 файлів в `app/` містять копіпастну inline функцію `createSupabase()`:

```typescript
// Повторюється в 11 файлах — ПРОБЛЕМА
async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: ... } }
  );
}
```

При цьому є готовий хелпер `createServerSupabaseClient()` в `packages/simplycms/core/src/supabase/server.ts`, який використовується лише в одному місці.

**Файли з дублюванням:**
- `app/(storefront)/catalog/page.tsx`
- `app/(storefront)/catalog/[sectionSlug]/page.tsx`
- `app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx`
- `app/(storefront)/properties/page.tsx`
- `app/(storefront)/properties/[propertySlug]/page.tsx`
- `app/(storefront)/properties/[propertySlug]/[optionSlug]/page.tsx`
- `app/(protected)/layout.tsx`
- `app/auth/callback/route.ts`
- `app/api/guest-order/route.ts`
- `app/api/health/route.ts`
- `app/sitemap.ts`

### 2.2 Middleware не використовує core middleware helper

**BRD вимога (Секція 10.2):**
```typescript
import { createMiddlewareClient } from '@simplycms/core/supabase/middleware';
const { supabase, response } = createMiddlewareClient(request);
```

**Факт:** `middleware.ts` дублює логіку inline замість використання `createMiddlewareSupabaseClient()` з `@simplycms/core/supabase/middleware`:

```typescript
// middleware.ts — inline createServerClient замість core helper
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { cookies: { ... } }
);
```

### 2.3 `simplycms.config.ts` не відповідає BRD-специфікації

**BRD вимога (Секція 14.4):**
```typescript
import { defineConfig } from '@simplycms/core';
export default defineConfig({
  theme: defaultTheme,
  plugins: [],
  supabase: { ... },
  seo: { ... },
});
```

**Факт:**
- Немає функції `defineConfig()` в core
- Немає властивостей `theme` та `plugins` в конфігурації
- Конфігурація не використовується жодним компонентом системи

```typescript
// simplycms.config.ts — НЕПОВНА
const config: SimplyCMSConfig = {
  supabase: { url: ..., anonKey: ... },
  seo: { siteName: ..., defaultTitle: ..., titleTemplate: ... },
  locale: 'uk-UA',
  currency: 'UAH',
  // ВІДСУТНІ: theme, plugins
};
```

### 2.4 `next/image` не використовується жодного разу

**BRD вимога (Фаза 7):** Замінити `<img>` на `next/image` для оптимізації зображень.

**Факт:** `next/image` не імпортується в жодному компоненті (окрім type declarations). Всі зображення використовують `<img>`:
- `themes/default/components/Header.tsx` — `<img src={logoUrl}>`
- `themes/default/components/Footer.tsx` — `<img src={logoUrl}>`
- `themes/default/components/ProductCard.tsx` — `<img src={firstImage}>`
- `themes/default/components/BannerSlider.tsx` — `<img>` теги
- `core/components/catalog/ProductCard.tsx` — `<img>`
- `core/components/profile/AvatarUpload.tsx` — `<img>`

### 2.5 Schema.org / JSON-LD відсутній

**BRD вимога (Фаза 7):** Додати Schema.org structured data для товарів.

**Факт:** Жодного файлу з JSON-LD або Schema.org розміткою не знайдено в проекті.

### 2.6 Revalidation API не відповідає BRD

**BRD вимога (Секція 9.2):**
```typescript
// Очікуваний API
body: JSON.stringify({ type: 'product', slug, sectionSlug })
// → revalidatePath(`/catalog/${sectionSlug}/${slug}`)
// → revalidatePath(`/catalog/${sectionSlug}`)
// → revalidatePath('/catalog')
```

**Факт:** API приймає `{ secret, path }` і ревалідує лише один шлях:

```typescript
// app/api/revalidate/route.ts — СПРОЩЕНИЙ
const { secret, path } = await request.json();
revalidatePath(path); // Тільки один шлях
```

Відсутня каскадна ревалідація пов'язаних сторінок (product → section → catalog).

---

## 3. СЕРЕДНІ ПРОБЛЕМИ (Severity: Medium)

### 3.1 useAuth зберігає setTimeout для перевірки ролі

**BRD вимога (Секція 10.3):**
```
Client-side admin check (setTimeout) → Server-side middleware check
```

**Факт:** `useAuth.tsx` все ще використовує `setTimeout` для перевірки ролі адміна:

```typescript
// packages/simplycms/core/src/hooks/useAuth.tsx:40
setTimeout(async () => {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    ...
}, 0);
```

Хоча middleware тепер перевіряє роль на сервері, клієнтський хук все ще має антипатерн з setTimeout.

### 3.2 QueryClient створюється як module-level singleton

**Проблема:** В `CMSProvider.tsx` QueryClient створюється на рівні модуля:

```typescript
const queryClient = new QueryClient({...});
```

В Next.js App Router це може призвести до шарингу стану між різними запитами на сервері. Рекомендується створювати QueryClient через `useState` або `useRef` всередині компонента.

### 3.3 Theme pages — re-exports в заглушки

15 з 16 theme pages є re-exports в core pages, які є заглушками:

```typescript
// themes/default/pages/CatalogPage.tsx
"use client";
export { default } from "@simplycms/core/pages/Catalog";
// → Catalog.tsx: return <div>Catalog</div>
```

Це означає, що тема за замовчуванням не надає жодного реального UI, окрім HomePage.

### 3.4 Cart storage key "solarstore-cart"

```typescript
// packages/simplycms/core/src/hooks/useCart.tsx:33
const CART_STORAGE_KEY = "solarstore-cart";
```

Залишковий артефакт з попереднього проекту. Повинен бути `"simplycms-cart"` або конфігуруватись.

### 3.5 Beauty theme query keys

В `themes/default/pages/HomePage.tsx` та `themes/default/components/Header.tsx` використовуються query keys з префіксом "beauty-":

```typescript
queryKey: ["beauty-featured-products"]
queryKey: ["beauty-new-products"]
queryKey: ["beauty-root-sections"]
queryKey: ["beauty-sections-nav"]
```

Це артефакт з beauty теми, що був перенесений в default тему.

---

## 4. ПОЗИТИВНІ АСПЕКТИ

### 4.1 Адмін-панель — повна реалізація (9/10)

- **58 сторінок**, 11500+ рядків коду
- Всі сторінки з BRD реалізовані: Products, Sections, Orders, Users, Shipping, Discounts, Reviews, Banners, Themes, Plugins, Settings, PriceTypes, UserCategories, OrderStatuses
- `AdminLayout` з auth guard, sidebar, responsive design
- `AdminSidebar` з 274 рядками — повна навігація з іконками та групами
- Dynamic import з `{ ssr: false }` — правильний підхід для адмін-панелі
- Інтеграція з `PluginSlot` для розширення

### 4.2 Компоненти core — повна реалізація

Компоненти (не pages) перенесені повністю:

| Група | Файлів | Рядків | Статус |
|-------|--------|--------|--------|
| catalog/ | 8 | 1170 | Повна реалізація |
| checkout/ | 12 | 1895 | Повна реалізація |
| cart/ | 3 | 237 | Повна реалізація |
| reviews/ | 5 | 558 | Повна реалізація |
| profile/ | 4 | 812 | Повна реалізація |
| **Разом** | **32** | **4672** | **Все перенесено** |

### 4.3 Hooks — повна реалізація

| Hook | Рядків | Статус |
|------|--------|--------|
| useAuth.tsx | 102 | Повний (cookie-based) |
| useCart.tsx | 146 | Повний (localStorage) |
| useDiscountedPrice.ts | 147 | Повний |
| useStock.ts | 131 | Повний |
| useProductsWithStock.ts | 115 | Повний |
| useProductReviews.ts | 174 | Повний |
| useBanners.ts | 88 | Повний |
| usePriceType.ts | 44 | Повний |
| **Разом** | **1040** | **Все перенесено** |

### 4.4 Бізнес-логіка — повна реалізація

| Модуль | Рядків | Статус |
|--------|--------|--------|
| discountEngine.ts | 374 | Повна реалізація |
| priceUtils.ts | 36 | Повна реалізація |
| shipping/ | 302 | Повна реалізація |
| supabase.ts (auth helpers) | 54 | Повна реалізація |

### 4.5 Система плагінів — покращена (9/10)

- `HookRegistry.ts` — ідентичний референсу
- `PluginLoader.ts` — покращений (explicit DI замість module import)
- `PluginSlot.tsx` — повна реалізація
- 30 hook points визначено
- Повна типізація

### 4.6 Система тем — повна реалізація (8/10)

- `ThemeRegistry.ts` — з валідацією та кешуванням
- `ThemeContext.tsx` — з CSS variable injection
- `ThemeResolver.ts` — з fallback support
- Розширені типи (більше pages ніж у референсі)
- Default тема має повні layouts та components (крім pages)

### 4.7 SEO-інфраструктура

- `app/sitemap.ts` — динамічний sitemap з sections та products
- `app/robots.ts` — коректний robots.txt
- `generateMetadata()` — реалізований для product та section pages
- OpenGraph tags для product pages

### 4.8 Архітектура та конфігурація

- Next.js 16 з App Router — сучасний стек
- pnpm workspaces — коректно налаштовані
- TypeScript path aliases — відповідають BRD
- Tailwind CSS з design tokens
- Git subtree scripts в package.json
- `transpilePackages` для workspace packages
- `serverExternalPackages` для TipTap
- Remote image patterns для Supabase Storage

### 4.9 Міграції БД — повне перенесення

30 міграцій ідентично скопійовані з `temp/supabase/migrations/` в `supabase/migrations/` (рівень проекту). Seed-копії для ядра — в `packages/simplycms/schema/seed-migrations/`.

---

## 5. РЕКОМЕНДАЦІЇ ДЛЯ ВИПРАВЛЕННЯ

### Пріоритет 1 (Critical — блокуючі)

1. **Зробити `(storefront)/layout.tsx` Server Component** — видалити `"use client"`, адаптувати MainLayout для серверного рендерингу
2. **Реалізувати core pages** — перенести логіку з `temp/src/pages/` в `packages/simplycms/core/src/pages/`
3. **Підключити тему до SSR-сторінок** — product, catalog, section pages мають використовувати компоненти теми з передачею серверних даних
4. **Зробити HomePage SSR** — перенести data fetching з useQuery в Server Component

### Пріоритет 2 (Major — важливі)

5. **Усунути дублювання createSupabase()** — використовувати `createServerSupabaseClient()` з core
6. **Middleware** — використовувати `createMiddlewareSupabaseClient()` з core
7. **Реалізувати `defineConfig()`** — додати функцію в core та підключити theme/plugins через конфіг
8. **Замінити `<img>` на `next/image`** — у всіх компонентах
9. **Додати Schema.org** — JSON-LD для product pages
10. **Виправити revalidation API** — каскадна ревалідація згідно BRD

### Пріоритет 3 (Medium — бажані)

11. **Виправити cart storage key** — `solarstore-cart` → `simplycms-cart`
12. **Виправити query key prefix** — `beauty-` → `default-` або без префіксу
13. **QueryClient** — створювати через useState замість module-level
14. **useAuth setTimeout** — замінити на `queueMicrotask()` або прибрати

---

## 6. МАТРИЦЯ ВІДПОВІДНОСТІ BRD

### Фаза 0: Підготовка середовища

| Вимога | Статус | Деталі |
|--------|--------|--------|
| Перемістити поточний код в ./temp/ | ✅ | Виконано |
| Ініціалізувати Next.js проект | ✅ | Next.js 16 |
| Налаштувати workspace | ✅ | pnpm workspaces |
| TypeScript path aliases | ✅ | Всі aliases з BRD |
| Tailwind CSS | ✅ | v4 |
| globals.css / дизайн-система | ✅ | Перенесено |
| .env.local | ✅ | .env.example є |

### Фаза 1: Ядро (packages/simplycms/)

| Вимога | Статус | Деталі |
|--------|--------|--------|
| @simplycms/ui — shadcn/ui компоненти | ✅ | 60+ компонентів |
| @simplycms/core — Supabase client (server/client/middleware) | ✅ | Всі 3 варіанти |
| @simplycms/core — Hooks | ✅ | 11 hooks перенесено |
| @simplycms/core — Бізнес-логіка | ✅ | discountEngine, priceUtils, shipping |
| @simplycms/core — TypeScript типи | ✅ | Database types |
| @simplycms/core — CMSProvider | ✅ | QueryClient + Auth + Cart |
| @simplycms/plugins — HookRegistry, PluginLoader, PluginSlot | ✅ | Повна реалізація |
| @simplycms/themes — ThemeRegistry, ThemeContext | ✅ | Повна реалізація |
| supabase/ — Міграції (рівень проекту) | ✅ | 30 міграцій |
| supabase/ — Edge Functions | ✅ | get-guest-order |

### Фаза 2: Публічні SSR-сторінки

| Вимога | Статус | Деталі |
|--------|--------|--------|
| app/layout.tsx з провайдерами | ✅ | ThemeProvider, Providers, Toaster |
| middleware.ts | ✅ | Auth guard для admin та profile |
| (storefront)/layout.tsx — Server Component | ❌ | `"use client"` — порушує SSR |
| Головна сторінка — SSR | ❌ | Client-side useQuery |
| Каталог — SSR + клієнтські фільтри | ⚠️ | SSR data fetching є, але UI заглушка |
| Категорія — SSR + ISR | ⚠️ | SSR data fetching є, але UI заглушка |
| Товар — SSR + ISR + generateMetadata | ⚠️ | SSR data fetching є, metadata є, але UI заглушка |
| Властивості — SSR | ⚠️ | SSR data fetching є, але UI заглушка |
| generateMetadata для SEO | ✅ | Product, section, properties |
| ISR revalidation | ⚠️ | Часткова (спрощений API) |
| api/revalidate/route.ts | ⚠️ | Є, але не відповідає BRD |
| not-found.tsx, error.tsx | ✅ | Реалізовані |

### Фаза 3: Клієнтські сторінки

| Вимога | Статус | Деталі |
|--------|--------|--------|
| Кошик | ❌ | Заглушка (core/pages/Cart.tsx) |
| Checkout | ❌ | Заглушка |
| Auth | ⚠️ | Базова форма в app/auth/page.tsx, але core/pages/Auth.tsx заглушка |
| Order Success | ⚠️ | Мінімальна реалізація |

### Фаза 4: Профіль користувача

| Вимога | Статус | Деталі |
|--------|--------|--------|
| (protected)/layout.tsx з auth guard | ✅ | Server-side auth check |
| Profile | ❌ | Заглушка |
| Orders | ❌ | Заглушка |
| Order Detail | ❌ | Заглушка |
| Settings | ❌ | Заглушка |

### Фаза 5: Адмін-панель

| Вимога | Статус | Деталі |
|--------|--------|--------|
| AdminLayout, AdminSidebar | ✅ | Повна реалізація |
| Адмін-компоненти | ✅ | 14 компонентів |
| admin/layout.tsx | ✅ | Dynamic import, ssr: false |
| Dashboard | ✅ | 143 рядки |
| Products (list + edit + new) | ✅ | 166 + 456 рядків |
| Sections | ✅ | Повна реалізація |
| Orders (list + detail) | ✅ | 106 + 646 рядків |
| Users | ✅ | 313 + 524 рядки |
| Shipping | ✅ | Methods + Zones + Pickup Points |
| Discounts | ✅ | 312 + 574 рядки |
| Reviews | ✅ | Повна реалізація |
| Banners | ✅ | Повна реалізація + 458 BannerEdit |
| Themes management | ✅ | Повна реалізація |
| Plugins management | ✅ | 364 рядки (PluginSettings) |
| Settings | ✅ | 137 рядків |
| Price Types | ✅ | Повна реалізація |
| User Categories | ✅ | + Rules (580 рядків) |
| Order Statuses | ✅ | 488 рядків |

### Фаза 6: Тема за замовчуванням

| Вимога | Статус | Деталі |
|--------|--------|--------|
| themes/default/ структура | ✅ | manifest, index, layouts, pages, components |
| Layouts для Server Components | ❌ | Всі `"use client"` |
| Pages для SSR data fetching | ❌ | 15/16 re-export в заглушки |
| manifest.ts | ✅ | Повний |
| HomePage | ✅ | 144 рядки (але client-side) |
| Theme components | ✅ | Header (187), Footer (93), BannerSlider (163), ProductCard (90), ProductCarousel (88) |

### Фаза 7: Оптимізація та полірування

| Вимога | Статус | Деталі |
|--------|--------|--------|
| next/image | ❌ | Не використовується |
| Schema.org structured data | ❌ | Відсутній |
| OpenGraph зображення | ⚠️ | Часткова (тільки product) |
| robots.txt | ✅ | Реалізований |
| sitemap.xml | ✅ | Динамічний з БД |

---

## 7. ВИСНОВКИ

### Що зроблено добре:
1. **Архітектура monorepo** — повністю відповідає BRD
2. **Адмін-панель** — повна реалізація всіх 40+ сторінок
3. **Системні модулі** — plugins, themes, hooks, бізнес-логіка
4. **Компоненти** — catalog, checkout, cart, reviews, profile повністю перенесені
5. **Supabase SSR** — server/client/middleware клієнти створені
6. **SEO-інфраструктура** — sitemap, robots, metadata generation

### Що не зроблено:
1. **SSR-first для storefront** — ключова вимога BRD порушена
2. **Core pages** — 15 заглушок замість реального функціоналу
3. **Інтеграція тем з SSR** — тема не використовується на серверних сторінках
4. **Оптимізація зображень** — `next/image` не застосований
5. **Schema.org** — відсутній
6. **`defineConfig()`** — архітектурний контракт не реалізований

### Оцінка за фазами BRD:
- Фаза 0 (Підготовка): **10/10**
- Фаза 1 (Ядро): **9/10**
- Фаза 2 (SSR сторінки): **3/10**
- Фаза 3 (Client сторінки): **2/10**
- Фаза 4 (Профіль): **3/10**
- Фаза 5 (Адмін-панель): **10/10**
- Фаза 6 (Тема): **5/10**
- Фаза 7 (Оптимізація): **3/10**
