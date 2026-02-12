# Task: SSR-first рефакторинг, типізація та модернізація

## Контекст

Цей проект — міграція e-commerce CMS з Vite SPA на Next.js SSR-first архітектуру. **Головна мотивація переходу — SEO та SSR для публічних (storefront) сторінок.** Після генерації актуального файлу DB-типів (`supabase/types.ts`) виявилася критична проблема: **SSR є "фейковим"** — серверні сторінки запитують дані, але клієнтські компоненти ігнорують передані пропси і роблять повторний fetch на клієнті. Єдиний виняток — `HomePage` в `themes/default/`, який коректно використовує `initialData` патерн.

Крім архітектурної проблеми SSR, TypeScript компілятор виявив **36 TS-помилок** в 15 файлах і **85 lint-проблем** (2 errors, 83 warnings), включаючи невідповідність DB-таблиць, `any`-касти, та Zod 4 API зміни.

**Стек:** Next.js 16.1.6, Zod 4.3.6, react-hook-form 7.71.1, @hookform/resolvers 5.2.2, @supabase/ssr 0.8.0, TanStack React Query, TypeScript strict mode.

**Пов'язана документація:** `BRD_SIMPLYCMS_NEXTJS.md` (секції 7, 9, 10, 11).

### Діагностика: чому SSR не працює

Поточний стан storefront-сторінок:

| Server Page (app/) | Що робить | Client Page (core/pages/) | Що робить |
|---|---|---|---|
| `catalog/page.tsx` | Fetch sections + products → передає `initialSections`, `initialProducts` | `Catalog.tsx` | **NO PROPS** (`CatalogPage()`), `useQuery` без `initialData` |
| `catalog/[sectionSlug]/page.tsx` | Fetch section + products → передає 4 пропси | `CatalogSection.tsx` | **NO PROPS**, `useParams()` |
| `catalog/.../[productSlug]/page.tsx` | Fetch product + JSON-LD → передає `product`, `sectionSlug` | `ProductDetail.tsx` | **NO PROPS**, `useParams()` |
| `properties/page.tsx` | Fetch з НЕПРАВИЛЬНОЇ таблиці → передає `properties` | `Properties.tsx` | **NO PROPS** |
| `page.tsx` (home) | Fetch banners, featured, new, sections → передає пропси | `HomePage.tsx` (theme) | **ПРИЙМАЄ ПРОПСИ** ✅, `initialData` в `useQuery` |

**Результат:** Google/crawler отримує порожній shell для каталогу, секцій, товарів — весь контент з'являється лише після JS hydration. Це повністю нівелює причину міграції на Next.js.

---

## Вимоги

### Фаза 0: Механічні виправлення (~1 год)

Тривіальні правки, що не потребують архітектурних рішень.

- [ ] **0.1.** `middleware.ts` → `proxy.ts`: перейменувати файл, змінити назву функції `middleware()` → `proxy()`. Логіка auth guards залишається без змін. Перевірити актуальний API через MCP context7 (Next.js 16 proxy migration). Аналогічно перейменувати helper `packages/simplycms/core/src/supabase/middleware.ts` → `proxy.ts`, `createMiddlewareSupabaseClient` → `createProxySupabaseClient`. Оновити всі імпорти.

- [ ] **0.2.** `packages/simplycms/core/src/hooks/useAuth.tsx:49` — `queueMicrotask(callback, 0)` → прибрати другий аргумент (API приймає лише 1).

- [ ] **0.3.** `packages/simplycms/core/src/pages/Auth.tsx` — рядки 71, 128: `.error.errors.forEach()` → `.error.issues.forEach()` (Zod 4 API). Також типізувати `err` параметр в catch (прибрати implicit `any`).

- [ ] **0.4.** `packages/simplycms/core/src/pages/ProfileOrderDetail.tsx:162` — `.eq("user_id", user?.id)` передає `string | undefined` замість `string`. Додати early return guard.

- [ ] **0.5.** `packages/simplycms/core/src/pages/ProfileSettings.tsx:86` — `string | null` → `string | undefined` невідповідність. Привести через `?? undefined`.

- [ ] **0.6.** `packages/simplycms/core/src/pages/PropertyPage.tsx:218` — `has_modifications: boolean | null` → `boolean | undefined`. Привести через `?? false`.

- [ ] **0.7.** Tailwind v4 deprecated class warnings (~25 місць): `rounded-sm` → `rounded-xs`, `shadow-sm` → `shadow-xs`, `ring-offset-*` → equvalent і т.д. Перевірити повний перелік через IDE або `pnpm build` output.

- [ ] **0.8.** Оновити `peerDependencies` в `packages/simplycms/core/package.json` — `"next": "^15.0.0"` → `"^15.0.0 || ^16.0.0"`.

### Фаза 1: SSR-first архітектура (КЛЮЧОВА ФАЗА, ~4-6 год)

**Це серце всього рефакторингу.** Мета: кожна storefront-сторінка повинна рендерити контент у HTML на сервері, щоб пошуковий бот отримав повну сторінку без JavaScript.

#### 1A. Зміна контракту ThemePages

- [ ] **1A.1.** Оновити `ThemePages` інтерфейс в `packages/simplycms/theme-system/src/types.ts`:
  - Storefront-сторінки, що потребують SSR-даних, мають змінити тип з `React.ComponentType` на `React.ComponentType<XxxPageProps>` з типізованими optional пропсами
  - Сторінки, які є client-only (Cart, Checkout, Auth, Profile*, OrderSuccess, NotFound) — залишаються `React.ComponentType` без пропсів
  - Конкретний перелік сторінок для оновлення: `HomePage`, `CatalogPage`, `CatalogSectionPage`, `ProductPage`, `PropertiesPage`, `PropertyDetailPage`, `PropertyOptionPage`

- [ ] **1A.2.** Створити типізовані Props-інтерфейси для кожної SSR-сторінки в `@simplycms/core`. Всі серверні пропси мають бути **optional** (`?`), щоб компоненти працювали і без SSR-даних (fallback на client fetch). Інтерфейси базуються на Supabase `Tables<'table'>` типах, а не на `any[]`.

#### 1B. Рефакторинг core page компонентів

- [ ] **1B.1.** `Catalog.tsx` — додати optional пропси (`initialSections?`, `initialProducts?`), передати їх як `initialData` в відповідні `useQuery` виклики. Функція `CatalogPage()` → `CatalogPage(props: CatalogPageProps)`.

- [ ] **1B.2.** `CatalogSection.tsx` — додати optional пропси (`sectionSlug?`, `initialSection?`, `initialSections?`, `initialProducts?`). Пріоритет: props.sectionSlug > useParams(). `initialData` для всіх useQuery.

- [ ] **1B.3.** `ProductDetail.tsx` — додати optional пропси (`product?`, `sectionSlug?`). Якщо `product` передано — використати як `initialData`, інакше fallback на client fetch через useParams.

- [ ] **1B.4.** `Properties.tsx` — додати optional `initialProperties?`. `initialData` в useQuery.

- [ ] **1B.5.** `PropertyDetail.tsx` — додати optional `property?`, `options?`. `initialData` в useQuery.

- [ ] **1B.6.** `PropertyPage.tsx` — додати optional `property?`, `option?`, `initialProducts?`. `initialData` в useQuery.

#### 1C. Оновлення theme page re-exports

- [ ] **1C.1.** Оновити re-exports в `themes/default/pages/` та `themes/solarstore/pages/` — забезпечити проксирування нових пропсів у core компоненти.

- [ ] **1C.2.** `themes/default/pages/HomePage.tsx` — вже працює коректно. Типізувати `any[]` пропси на конкретні DTO інтерфейси (зараз `banners?: any[]` тощо).

- [ ] **1C.3.** `themes/default/components/BannerSlider.tsx` — розширити для прийому optional `banners` prop (зараз тягне дані лише через хук `useBanners`). Або: server page передає banners → HomePage → BannerSlider через пропс.

#### 1D. Оновлення серверних сторінок

- [ ] **1D.1.** `app/(storefront)/page.tsx` (home) — прибрати `as any` касти для `p.sections`. Типізувати через Supabase PostgREST join типи.

- [ ] **1D.2.** `app/(storefront)/catalog/page.tsx` — вже передає пропси, після 1B.1 TS помилки зникнуть. Перевірити select-запит на відповідність новому Props інтерфейсу.

- [ ] **1D.3.** `app/(storefront)/catalog/[sectionSlug]/page.tsx` — аналогічно, після 1B.2.

- [ ] **1D.4.** `app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx` — вже має JSON-LD. Після 1B.3 TS помилки зникнуть. Перевірити повноту SSR-даних.

- [ ] **1D.5.** `app/(storefront)/properties/page.tsx` — виправити `.from('properties')` → `.from('section_properties')`. Оновити select-поля. Після 1B.4 передати як `initialProperties`.

- [ ] **1D.6.** `app/(storefront)/properties/[propertySlug]/page.tsx` — виправити `.from('properties')` → `.from('section_properties')`. Після 1B.5 передати як типізовані пропси.

- [ ] **1D.7.** `app/(storefront)/properties/[propertySlug]/[optionSlug]/page.tsx` — виправити `.from('properties')` → `.from('section_properties')`, `.from('property_values')` → `.from('property_options')`. Після 1B.6 передати як типізовані пропси. Перевірити поля через MCP supabase (таблиці `section_properties`, `property_options`).

#### 1E. SEO верифікація

- [ ] **1E.1.** Для кожної оновленої storefront-сторінки: перевірити що `curl` (або `view-source:`) повертає content-filled HTML з назвами товарів/секцій. Не порожній shell.

- [ ] **1E.2.** Перевірити `generateMetadata` для всіх динамічних сторінок — мають повертати релевантні title/description/OG для SEO.

- [ ] **1E.3.** Перевірити `revalidate` значення — ISR intervals мають бути розумними для e-commerce (поточні: 1800s каталог, 3600s товари, 86400s характеристики).

### Фаза 2: Data layer виправлення (~2-3 год)

- [ ] **2.1.** `app/api/guest-order/route.ts` — insert payload використовує поля, яких немає в DB-схемі (`customer_name`, `customer_phone`, `customer_email`, `total_amount`, `status`). Реальні поля: `first_name`, `last_name`, `email`, `phone`, `total`, `subtotal`, `status_id`, `payment_method`. Переписати відповідно до `TablesInsert<'orders'>`. **Примітка:** `order_number` має DB trigger `generate_order_number()`, який автоматично заповнює поле якщо NULL — не потрібна генерація на стороні API.

- [ ] **2.2.** `app/sitemap.ts:35` — `(product: any)` → типізувати через результат Supabase select.

- [ ] **2.3.** `app/api/health/route.ts` — `Record<string, any>` (рядок 8) та `(check: any)` (рядок 42) → замінити на typed interface.

### Фаза 3: Форми та валідація (~1-2 год)

- [ ] **3.1.** `packages/simplycms/core/src/pages/Checkout.tsx` — множинні помилки типізації:
  - `zodResolver(checkoutSchema)` з `.refine()` — може бути несумісність типів між Zod 4 infer та react-hook-form. Перевірити `@hookform/resolvers` 5.x + Zod 4.x сумісність через MCP context7.
  - `form.handleSubmit(onSubmit)` і передача `form` в підкомпоненти (`CheckoutContactForm`, `CheckoutRecipientForm`, `CheckoutDeliveryForm`, `CheckoutPaymentForm`, `CheckoutOrderSummary`) — пропс `form` не існує на їхніх інтерфейсах. Рішення: додати пропс `form` в інтерфейс кожного підкомпонента, або рефакторнути на `useFormContext`.
  - **Увага:** `z.enum(["cash", "online"], { required_error: ... })` — це валідний Zod 4 API (підтверджено через context7). Проблема НЕ в `required_error`.

### Фаза 4: Видалення `any` — core pages та hooks (~4-6 год)

Всі `any` повинні бути замінені на конкретні типи з `Tables<'table'>`, `TablesInsert<...>`, `TablesUpdate<...>`, або виведені з Supabase join-результатів.

- [ ] **4.1.** `packages/simplycms/core/src/pages/ProductDetail.tsx` — прибрати всі `as any` касти:
  - `(m: any)` → типізувати modifications через select result
  - `Record<string, any[]>` → конкретний тип grouped values
  - `(product as any)?.has_modifications` → додати поле в select або DB-тип
  - `(pv: any)` → типізувати property values
  - `(product as any).product_prices/stock_status/sku` → правильний тип select-результату `select('*')`

- [ ] **4.2.** `packages/simplycms/core/src/pages/CatalogSection.tsx` — замінити всі `as any` (~14 місць). `Record<string, any>` для фільтрів → `Record<string, unknown>` або `FilterState` тип.

- [ ] **4.3.** `packages/simplycms/core/src/pages/Catalog.tsx` — замінити `as any` (~4 місця).

- [ ] **4.4.** `packages/simplycms/core/src/pages/PropertyPage.tsx` — замінити `as any` (~6 місць).

- [ ] **4.5.** `packages/simplycms/core/src/pages/ProfileSettings.tsx` — `catch (error: any)` → `catch (error: unknown)` + type guard.

- [ ] **4.6.** `packages/simplycms/core/src/pages/ProfileOrderDetail.tsx` — `discount_data: any | null` → конкретний тип. `catch (error: any)` → `catch (error: unknown)`.

- [ ] **4.7.** `packages/simplycms/core/src/pages/Checkout.tsx` — `catch (error: any)` → `catch (error: unknown)`.

- [ ] **4.8.** `packages/simplycms/core/src/hooks/usePriceType.ts:34` — `(data?.category as any)?.price_type_id` → типізувати join.

- [ ] **4.9.** `packages/simplycms/core/src/hooks/useDiscountedPrice.ts` — `as any` касти для enum полів (`operator`, `discount_type`, `discount_targets`, `discount_conditions`) → вивести з DB enum або select join.

- [ ] **4.10.** Типізація Supabase join `(p.sections as any).slug` — зачеплені файли:
  - `app/(storefront)/page.tsx`
  - `themes/default/pages/HomePage.tsx`
  - `themes/solarstore/pages/HomePage.tsx`
  
  Supabase PostgREST при `.select("..., sections!FK(slug)")` повертає типізований вложений об'єкт — потрібно правильно типізувати через DB types, а не кастити.

### Фаза 5: Видалення `any` — admin (~6-8 год)

- [ ] **5.1.** `packages/simplycms/admin/src/pages/` — масові `as any` в: BannerEdit, DiscountEdit, DiscountGroupEdit, Discounts, Orders, PriceValidator, ProductEdit, Products, Properties, Settings, UserCategories, UserCategoryRuleEdit, PriceTypeEdit. Замінити на `Tables<'table'>`, `TablesInsert<...>`, `TablesUpdate<...>`.

- [ ] **5.2.** `packages/simplycms/admin/src/components/` — `ProductModifications.tsx`, `SectionPropertiesTable.tsx` — замінити `as any` на типізовані.

- [ ] **5.3.** `packages/simplycms/plugin-system/src/PluginLoader.ts:144` — `config as any` → `config as Json` або `TablesUpdate<'plugins'>['config']`.

- [ ] **5.4.** `packages/simplycms/ui/src/chart.tsx` — `any` в Recharts callback types (shadcn/ui code) — замінити на `unknown` де можливо.

### Фаза 6: ESLint cleanup (~3-4 год)

- [ ] **6.1.** **Errors** (блокують CI):
  - `Catalog.tsx:117` — `prefer-const`: `let resolved` → `const`
  - `NotFound.tsx:18` — `@next/next/no-html-link-for-pages`: `<a>` → `<Link>`

- [ ] **6.2.** `@next/next/no-assign-module-variable` — перейменувати `module` на `pluginModule`/`themeModule`:
  - `InstallPluginDialog.tsx`, `PluginSettings.tsx`, `PluginLoader.ts`, `ThemeRegistry.ts`

- [ ] **6.3.** `react-hooks/set-state-in-effect` warnings (~13 місць) — рефакторнути setState в useEffect:
  - Admin: `AllProductProperties`, `ProductPricesEditor`, `ProductPropertyValues`, `StockByPointManager`, `BannerEdit`, `DiscountEdit`, `OrderDetail`, `ProductEdit`, `PropertyEdit`, `PropertyOptionEdit`, `SectionEdit`, `ThemeSettings`
  - Core: `FilterSidebar`, `CheckoutDeliveryForm`, `CheckoutRecipientForm`, `useCart`
  - Theme: `BannerSlider`
  
  Рішення: useMemo для derived state, useState initializer, useCallback. НЕ eslint-disable.

- [ ] **6.4.** `react-hooks/static-components` — компоненти в рендер-функціях:
  - `ReviewRichTextEditor.tsx` — `ToolbarButton` → винести за межі
  - `ActiveFilters.tsx` — `Button` → винести за межі

- [ ] **6.5.** `@typescript-eslint/no-unused-vars` (~20 місць) — видалити невикористовувані імпорти/змінні (повний перелік файлів: ImageUpload, InstallPluginDialog, RichTextEditor, StockByPointManager, DiscountEdit, Discounts, OrderStatuses, PickupPointEdit, PluginSettings, Products, Reviews, Settings, UserEdit, CatalogLayout, FilterSidebar, ProductReviews, ReviewRichTextEditor, use-toast, Auth, ProfileSettings, calendar).

- [ ] **6.6.** `jsx-a11y/alt-text` (~7 місць) — додати `alt` атрибут: ProductModifications, Banners, Products, Sections, BlogPreview, ProductCard (themes/default), ProductCard (core/components).

- [ ] **6.7.** `react-hooks/exhaustive-deps` — ImageUpload, CheckoutDeliveryForm, CheckoutRecipientForm. Виправити через додавання deps або useCallback.

- [ ] **6.8.** `react-hooks/incompatible-library` — `form.watch()` в ShippingMethodEdit, UserCategoryRuleEdit. Розглянути `useWatch`.

- [ ] **6.9.** `react-hooks/purity` — `Math.random()` в `sidebar.tsx:538`. Замінити на стабільний seed.

- [ ] **6.10.** `@typescript-eslint/no-unused-expressions` — `Discounts.tsx:131`.

### Фаза 7: Фіналізація (~30 хв)

- [ ] **7.1.** Увімкнути ESLint правило `@typescript-eslint/no-explicit-any` як `"warn"` в `eslint.config.mjs`.

- [ ] **7.2.** Перевірити `@supabase/ssr` сумісність з Next.js 16 через MCP context7/supabase.

- [ ] **7.3.** Перевірити `next.config.ts` на deprecated options для Next.js 16 через MCP context7.

- [ ] **7.4.** Фінальна перевірка: `pnpm typecheck && pnpm lint && pnpm build`.

---

## Clarify (питання перед імплементацією)

- [ ] **Q1.** Конкретна форма Props-інтерфейсів для SSR-сторінок
  - Чому це важливо: визначає контракт між Server Components і Client Components для всіх storefront-сторінок
  - Рекомендація: optional props з `initialData` в React Query (патерн вже працює в `HomePage`)
  - Вплив: ThemePages контракт, всі core pages та theme re-exports
  - **Рішення прийнято:** варіант `initialData` — відповідає BRD секція 9 (SSR+ISR для storefront). Потрібне лише уточнення правильних інтерфейсів для кожної сторінки.

- [ ] **Q2.** Properties routing: бізнес-логіка чи механічна заміна?
  - Чому це важливо: SSR server pages (`properties/*`) посилаються на неіснуючі таблиці (`properties`, `property_values`), але core pages (`Properties.tsx`, `PropertyDetail.tsx`, `PropertyPage.tsx`) коректно використовують `section_properties` / `property_options`
  - Варіант A: механічна заміна таблиць та полів в server pages (ймовірно достатньо)
  - Варіант B: глибша переробка routing/бізнес-логіки
  - Вплив: дані, routing, SEO
  - **Рекомендація:** Варіант A — core pages вже коректні, проблема лише в server pages

- [ ] **Q3.** `@supabase/ssr` 0.8 + Next.js 16 proxy — чи є known issues?
  - Чому це важливо: proxy migration може вимагати оновлення `@supabase/ssr`
  - Варіанти: перевірити через MCP context7 + supabase docs
  - Вплив: залежності, auth flow

- [x] **Q4.** ~~`order_number` DB default для guest-order route~~ — **ВИРІШЕНО:** існує DB trigger `generate_order_number()`, який автоматично заповнює `order_number` якщо NULL. Генерація на стороні API не потрібна.

---

## Рекомендовані патерни

### SSR initialData через React Query (КЛЮЧОВИЙ ПАТЕРН)
Серверний компонент (Server Component) fetch'ить дані → передає як optional props → клієнтський компонент використовує їх як `initialData` в `useQuery`. Дані рендеряться в HTML на сервері, React Query забезпечує client-side refresh.
- Де шукати робочий приклад: `themes/default/pages/HomePage.tsx` — ЄДИНИЙ коректно працюючий приклад в проекті. Показує Spring `initialData` для `useQuery` з `featuredProducts`, `newProducts`, `sections`.

### ThemePages з типізованими пропсами
Storefront-сторінки в `ThemePages` мають generic props для SSR-даних. Client-only сторінки (Cart, Checkout, Auth, Profile) залишаються без пропсів.
- Де шукати: `packages/simplycms/theme-system/src/types.ts` рядки 26-43 — поточний контракт для оновлення
- Де шукати spec: `BRD_SIMPLYCMS_NEXTJS.md` секція 7 — ThemeModule, ThemePages

### Типізація Supabase select з join'ами
Замість `(p.sections as any).slug` — використовувати вбудований тип Supabase PostgREST. Коли `.select("..., sections!FK(slug)")`, результат вже типізований — потрібно правильно destructure.
- Де шукати: `supabase/types.ts` → Relationships секції таблиці `products`

### Типізація результатів через Database helper types
Для select-результатів використовувати `Tables<'products'>` або `Database['public']['Tables']['products']['Row']`.
- Де шукати: `packages/simplycms/core/src/supabase/types.ts` — re-exports. `supabase/types.ts` — згенеровані типи.

### `catch (error: unknown)` + type guard
Замість `catch (error: any)` — `catch (error: unknown)` з `error instanceof Error ? error.message : 'Unknown error'`.
- Де шукати: `app/api/health/route.ts:54` — вже використовує цей патерн

### Zod 4 API
В Zod 4: `.issues` замість `.errors` для `ZodError`. `required_error` в `z.enum()`/`z.string()` — **валідний** (підтверджено). `z.safeParse` повертає `{ success, data }` або `{ success, error }`.
- Де шукати: MCP context7 → Zod 4 documentation

### Derived state замість setState в useEffect
Замість `useEffect(() => { setState(computed) }, [deps])` — `useMemo()` або useState initializer.
- Де шукати: React documentation, "You Might Not Need an Effect"

### Proxy file convention (Next.js 16)
Тривіальне перейменування: `middleware.ts` → `proxy.ts`, `middleware()` → `proxy()`. Export matcher config залишається.
- Де шукати: MCP context7 → Next.js 16 migration guide

---

## Антипатерни (уникати)

### ❌ `as any` для обходу Supabase типів
Маскує реальну невідповідність між кодом і DB-схемою. Якщо поле не існує в типі — запит або доступ до поля неправильний. Виправляти `select`/`from`, а не кастити.

### ❌ `as unknown as SomeType` для Supabase результатів
Обходить type safety. Якщо Supabase повертає "неправильний" тип — вирішувати через правильний `.select()` з коректними join'ами.

### ❌ Видалення SSR-prefetch замість виправлення клієнтських компонентів
**Критично:** НЕ вирішувати TS-помилки "IntrinsicAttributes" шляхом видалення серверного fetch'у в `app/(storefront)/*` сторінках. Правильне рішення — додати props до клієнтських компонентів. Інакше SSR стає безглуздим.

### ❌ Client-only fetch на storefront сторінках без fallback
Кожен `useQuery` на storefront-сторінці ПОВИНЕН мати `initialData` від серверного компонента. Без цього — порожній HTML для crawler'ів.

### ❌ TypeScript `any` в strict mode проекті
Заборонено. Використовувати `unknown` + type guards, generics, або конкретні типи.

### ❌ eslint-disable для приховування реальних проблем
Допускається лише `eslint-disable-next-line react-hooks/exhaustive-deps` з пояснюючим коментарем ЧОМУ залежність навмисно виключена.

### ❌ Компоненти всередині рендер-функцій
Створення компонентів (function/const) всередині іншого компонента → перестворення стану при кожному рендері. Виносити за межі.

### ❌ setState в useEffect для computed/derived state
Якщо стан виводиться з props/state — це derived state. Використовувати `useMemo`, не окремий `useState` + `useEffect`.

---

## Архітектурні рішення

- **Центральна зміна:** `ThemePages` контракт в `@simplycms/themes` — додати typed props для storefront-сторінок
- **Пакети зміни розподіляються:**
  - `@simplycms/themes` — ThemePages interface
  - `@simplycms/core` — core page components (props + initialData)
  - `@simplycms/admin` — admin pages/components (any cleanup)
  - `@simplycms/ui` — chart (any → unknown)
  - `@simplycms/plugins` — PluginLoader (module rename)
  - `app/` — SSR server pages, API routes, proxy migration
  - `themes/` — theme page re-exports, HomePage typing
- **Rendering стратегія:** SSR+ISR для storefront (ПОСИЛИТИ), Client-only для admin (без змін)
- **Міграція з temp/:** не потрібна — проблеми в вже мігрованому коді

---

## MCP Servers (обов'язково)

- **context7** — для перевірки API:
  - Next.js 16 proxy file convention (точний API)
  - `@hookform/resolvers` 5.x + Zod 4 `.refine()` сумісність
  - `@supabase/ssr` сумісність з Next.js 16
  - React Query `initialData` typing best practices
- **supabase** — для перевірки:
  - Структура таблиць `section_properties`, `property_options` (поля для select та маппінг)
  - Структура таблиці `orders` (required/optional поля для guest-order)
  - Join-шляхи для `.select()` запитів (products → sections, etc.)
- **shadcn** — якщо будуть зміни в UI компонентах (chart.tsx)

---

## Пов'язана документація

- `BRD_SIMPLYCMS_NEXTJS.md` секція 7 — система тем (ThemeModule, ThemePages контракт)
- `BRD_SIMPLYCMS_NEXTJS.md` секція 9 — SSR стратегія, ISR revalidation, Server vs Client Components
- `BRD_SIMPLYCMS_NEXTJS.md` секція 10 — автентифікація, Supabase SSR, middleware
- `BRD_SIMPLYCMS_NEXTJS.md` секція 11 — база даних, міграції
- `.github/instructions/data-access.instructions.md` — Supabase клієнти, типи, Server/Browser
- `.github/instructions/optimization.instructions.md` — SSR/ISR, React Query caching, initialData
- `.github/instructions/ui-architecture.instructions.md` — ThemePages, тема → core делегація
- `.github/instructions/coding-style.instructions.md` — заборона `any`, стиль коду
- `supabase/types.ts` — актуальні DB-типи (джерело правди)
- `packages/simplycms/theme-system/src/types.ts` — ThemePages контракт (ключовий файл)
- `themes/default/pages/HomePage.tsx` — **робочий приклад SSR initialData патерну**

---

## Порядок виконання

| Фаза | Опис | Залежить від | Час |
|------|------|---|---|
| **0** | Механічні виправлення (proxy rename, queueMicrotask, Zod issues, Tailwind, guards) | — | ~1 год |
| **1** | **SSR-first архітектура** (ThemePages, core pages props, initialData, server pages, SEO) | Фаза 0 | ~4-6 год |
| **2** | Data layer (guest-order, sitemap, health) | Фаза 0 | ~2-3 год |
| **3** | Форми та валідація (Checkout, Auth) | Фаза 0 | ~1-2 год |
| **4** | `any` cleanup — core (pages, hooks) | Фаза 1 | ~4-6 год |
| **5** | `any` cleanup — admin (pages, components) | Фаза 0 | ~6-8 год |
| **6** | ESLint cleanup (всі warnings) | Фази 1-5 | ~3-4 год |
| **7** | Фіналізація (ESLint rule, deps check, build) | Фаза 6 | ~30 хв |

**Фази 2, 3, 5 можна виконувати паралельно з Фазою 1.**

---

## Definition of Done

- [ ] `pnpm typecheck` — 0 помилок
- [ ] `pnpm lint` — 0 errors, 0 warnings (або мінімум з обґрунтованими eslint-disable)
- [ ] `pnpm build` — успішний без warnings (deprecated middleware, Tailwind classes)
- [ ] **SSR-критерій: `curl <storefront-url>` повертає HTML з контентом** (назви товарів, секцій, ціни — не порожній shell)
- [ ] Жодного `any` в `app/`, `packages/`, `themes/` (крім `temp/`)
- [ ] Жодного `as unknown as` без обґрунтованого коментаря
- [ ] `@typescript-eslint/no-explicit-any` увімкнений як `"warn"` в ESLint
- [ ] Auth guards працюють через proxy mechanism
- [ ] Усі storefront core-page компоненти приймають optional SSR-пропси з `initialData`
- [ ] `ThemePages` контракт типізований (storefront-сторінки з props, client-only без)
- [ ] Всі зображення мають `alt` атрибут
- [ ] Немає компонентів створених всередині рендер-функцій
- [ ] JSON-LD працює для product pages
