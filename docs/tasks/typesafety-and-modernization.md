# Task: Виправлення типізації, помилок компіляції та модернізація проекту

## Контекст

Після генерації актуального файлу DB-типів (`supabase/types.ts`) TypeScript-компілятор і ESLint виявили **36 TS-помилок** в 15 файлах і **85 lint-проблем** (2 errors, 83 warnings). Крім того, Next.js 16 deprecation виявив застарілий middleware file convention. Потрібне комплексне виправлення — не маскування через `any`/`as unknown`, а **реальне** усунення першопричин.

Проект: Next.js 16.1.6, Zod 4.3.6, react-hook-form 7.71.1, @hookform/resolvers 5.2.2, @supabase/ssr 0.8.0, TypeScript strict mode.

Пов'язана документація: `BRD_SIMPLYCMS_NEXTJS.md` (секції 7-11).

---

## Вимоги

### Категорія A: TypeScript-помилки компіляції (критично — блокують build)

- [ ] **A1.** Properties-сторінки використовують неіснуючі таблиці `properties` і `property_values` в Supabase-запитах. Реальні таблиці: `section_properties` та `property_options`. Зачеплені файли:
  - `app/(storefront)/properties/page.tsx` (2 errors)
  - `app/(storefront)/properties/[propertySlug]/page.tsx` (4 errors)
  - `app/(storefront)/properties/[propertySlug]/[optionSlug]/page.tsx` (7 errors)
  
  Потрібно: замінити `.from('properties')` на `.from('section_properties')`, `.from('property_values')` на `.from('property_options')`, та виправити select-поля і поля-маппінги (`value` → відповідне поле з `property_options`, `name` → поле з `section_properties`). Перевірити через MCP supabase структуру обох таблиць.

- [ ] **A2.** Компоненти theme pages (`CatalogPage`, `CatalogSectionPage`, `ProductDetailPage`, `PropertiesPage`, `PropertyDetailPage`, `PropertyPage`) — це **no-props** клієнтські компоненти, які беруть дані самостійно через React Query. Але SSR app-pages намагаються передавати їм пропси (`initialSections`, `initialProducts`, `product`, `sectionSlug`, `property`, `properties` тощо), що дає помилку `Property 'X' does not exist on type 'IntrinsicAttributes'`. Зачеплені файли:
  - `app/(storefront)/catalog/page.tsx` — передає `initialSections`, `initialProducts` в `CatalogPage`
  - `app/(storefront)/catalog/[sectionSlug]/page.tsx` — передає `sectionSlug`, `initialSection`, `initialSections`, `initialProducts`
  - `app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx` — передає `product`, `sectionSlug`
  - `app/(storefront)/properties/page.tsx` — передає `properties`
  - `app/(storefront)/properties/[propertySlug]/page.tsx` — передає `property`, `options`
  - `app/(storefront)/properties/[propertySlug]/[optionSlug]/page.tsx` — передає `property`, `option`, `products`
  
  Потрібно: привести до єдиного контракту. Компоненти core pages мають або (а) прийняти SSR-дані через типізовані пропси і передати їх як `initialData` в React Query, або (б) SSR-pages мають перестати передавати пропси. Рекомендований підхід — варіант (а): додати до кожного core page компонента типізований інтерфейс пропсів з optional `initial*` полями, і використовувати їх як `initialData` параметр у `useQuery`. Це дасть SSR+ISR, SEO-дані в HTML, і client-side refresh. Оновити також `ThemePages` контракт якщо потрібно.

- [ ] **A3.** `app/api/guest-order/route.ts` — insert в `orders` використовує поля `customer_name`, `customer_phone`, `customer_email`, `total_amount`, `status`, яких немає в DB-схемі. Реальні поля: `first_name`, `last_name`, `email`, `phone`, `total`, `subtotal`, `status_id`, `order_number`, `payment_method`. Потрібно: переписати insert-payload відповідно до `TablesInsert<'orders'>` з `supabase/types.ts`. Обов'язкове поле `order_number` — потрібна генерація (наприклад, через DB default або UUID). Перевірити required поля через MCP supabase.

- [ ] **A4.** `middleware.ts` — несумісність типів `NextRequest` між Next.js 16 і `@supabase/ssr` 0.8 (яка використовує Next.js 15 типи). Плюс Next.js 16 офіційно deprecates `middleware` на користь `proxy`. Потрібно: мігрувати на новий `proxy` file convention відповідно до офіційної міграційної документації Next.js 16. Перевірити поточний стан API через MCP context7 (`resolve-library-id` → `get-library-docs` для Next.js 16 proxy migration). Також оновити `@simplycms/core/supabase/middleware.ts` під нове API, або видалити якщо більше не потрібен.

- [ ] **A5.** `packages/simplycms/core/src/hooks/useAuth.tsx:49` — `queueMicrotask` викликається з 2 аргументами (як `setTimeout`), але приймає лише 1. Потрібно: прибрати другий аргумент `, 0`.

- [ ] **A6.** `packages/simplycms/core/src/pages/Auth.tsx` — `result.error.errors` не існує в Zod 4. В Zod 4 API змінився: замість `.errors` (Zod 3) потрібно використовувати `.issues` (Zod 4). Зачеплені рядки: 71, 128. Також: `err` має implicit `any` — виправити на типізований параметр. Перевірити Zod 4 API через MCP context7.

- [ ] **A7.** `packages/simplycms/core/src/pages/Checkout.tsx` — множинні помилки типізації:
  - `z.enum(["cash", "online"], { required_error: ... })` — `required_error` не існує в Zod 4 API. Потрібно перевірити/використати `{ message: ... }` або `{ error: ... }`.
  - `zodResolver(checkoutSchema)` повертає тип, несумісний з `useForm<CheckoutFormData>` — через `.refine()` Zod 4 може виводити інший тип. Потрібно: перевірити сумісність `@hookform/resolvers` 5.x з Zod 4.x через MCP context7 і виправити контракт.
  - `form.handleSubmit(onSubmit)` і передача `form` в підкомпоненти (`CheckoutContactForm`, `CheckoutRecipientForm`, `CheckoutDeliveryForm`, `CheckoutPaymentForm`, `CheckoutOrderSummary`) — пропс `form` не існує на їхніх інтерфейсах. Потрібно: додати пропс `form` в інтерфейс кожного подкомпонента (або переробити на useFormContext).

- [ ] **A8.** `packages/simplycms/core/src/pages/ProfileOrderDetail.tsx:162` — `.eq("user_id", user?.id)` передає `string | undefined`, а потрібен `string`. Додати guard `if (!user?.id) return`.

- [ ] **A9.** `packages/simplycms/core/src/pages/ProfileSettings.tsx:86` — `first_name: data.first_name` де `data.first_name` має тип `string | null`, а очікується `string | undefined`. Потрібно: замінити на `data.first_name ?? undefined` або оновити тип стану `profileData`.

- [ ] **A10.** `packages/simplycms/core/src/pages/PropertyPage.tsx:218` — `has_modifications: boolean | null` не сумісний з очікуваним `boolean | undefined` в `ProductCardProps`. Потрібно: привести через `?? false` або `?? undefined`, або оновити тип `ProductCardProps`.

- [ ] **A11.** `themes/default/pages/HomePage.tsx:92` — `BannerSlider` не приймає пропс `banners`. Компонент сам тягне дані через хук `useBanners`. Потрібно: або видалити передачу `banners` в SSR-шарі, або розширити `BannerSlider` для прийому `initialData`.

### Категорія B: Видалення всіх `any` в non-temp коді (strict mode compliance)

- [ ] **B1.** Замінити `(p.sections as any).slug` на типобезпечний доступ, виходячи з результату `.select("..., sections!FK(slug)")`. Supabase PostgREST повертає вложений об'єкт — використати type assertion через утиліту або inline guard. Зачеплені файли:
  - `app/(storefront)/page.tsx` (рядки 43, 52)
  - `themes/default/pages/HomePage.tsx` (рядки 46, 70)
  - `themes/solarstore/pages/HomePage.tsx` (рядки 78, 104)

- [ ] **B2.** `themes/default/pages/HomePage.tsx:13-16` — замінити `any[]` пропси (`banners`, `featuredProducts`, `newProducts`, `sections`) на конкретні DTO-інтерфейси.

- [ ] **B3.** `packages/simplycms/core/src/pages/ProductDetail.tsx` — прибрати всі `as any` касти:
  - Рядок 80: `(m: any) => m.id` — типізувати через результат select
  - Рядок 104: `Record<string, any[]>` — замінити на конкретний тип
  - Рядок 169: `(product as any)?.has_modifications` — додати поле в select або cast через DB-тип
  - Рядки 231, 246-248: `(pv: any)` — типізувати property values через Supabase types
  - Рядки 263, 318, 327, 331: `(product as any).product_prices/stock_status/sku` — поля є в `select('*')`, потрібно лише правильний тип select-результату

- [ ] **B4.** `packages/simplycms/core/src/pages/CatalogSection.tsx` — аналогічно B3, замінити всі `as any` (рядки 34, 92, 103-104, 106, 110, 133, 152, 162, 168, 216, 254, 279, 394). Рядок 34: `Record<string, any>` для фільтрів — замінити на `Record<string, unknown>` або на спеціалізований `FilterState` тип.

- [ ] **B5.** `packages/simplycms/core/src/pages/Catalog.tsx` — аналогічно, рядки 87, 114, 121, 388.

- [ ] **B6.** `packages/simplycms/core/src/pages/PropertyPage.tsx` — рядки 82, 104-105, 123-124, 127, 133.

- [ ] **B7.** `packages/simplycms/core/src/pages/ProfileSettings.tsx` — `catch (error: any)` (рядки 118, 145) → `catch (error: unknown)` + type guard.

- [ ] **B8.** `packages/simplycms/core/src/pages/ProfileOrderDetail.tsx` — `discount_data: any | null` (рядок 68) → конкретний тип. `catch (error: any)` (рядок 172) → `catch (error: unknown)`.

- [ ] **B9.** `packages/simplycms/core/src/pages/Checkout.tsx` — `catch (error: any)` (рядок 271) → `catch (error: unknown)`.

- [ ] **B10.** `packages/simplycms/core/src/hooks/usePriceType.ts:34` — `(data?.category as any)?.price_type_id` → типізувати join.

- [ ] **B11.** `packages/simplycms/core/src/hooks/useDiscountedPrice.ts` — рядки 60, 77, 83-84: `as any` касти для `operator`, `discount_type`, `discount_targets`, `discount_conditions` → вивести з DB enum або select join.

- [ ] **B12.** `packages/simplycms/admin/src/pages/` — масові `as any` (BannerEdit, DiscountEdit, DiscountGroupEdit, Discounts, Orders, PriceValidator, ProductEdit, Products, Properties, Settings, UserCategories, UserCategoryRuleEdit, PriceTypeEdit). Для кожного файлу: замінити на правильні типи з `Tables<'table_name'>`, `TablesInsert<...>`, `TablesUpdate<...>`, або виведені типи з join-результатів Supabase.

- [ ] **B13.** `packages/simplycms/admin/src/components/` — `ProductModifications.tsx` (рядки 87, 98), `SectionPropertiesTable.tsx` (рядки 91, 167) — замінити `as any` на типізовані.

- [ ] **B14.** `packages/simplycms/plugin-system/src/PluginLoader.ts:144` — `config as any` → `config as Json` або `as TablesUpdate<'plugins'>['config']`.

- [ ] **B15.** `app/sitemap.ts:35` — `(product: any)` → типізувати через результат select.

- [ ] **B16.** `app/api/health/route.ts` — `Record<string, any>` (рядок 8) та `(check: any)` (рядок 42) → замінити на typed interface.

- [ ] **B17.** `packages/simplycms/ui/src/chart.tsx` — `any` в Recharts callback types (рядки 98-102, 241). Це shadcn/ui генерований код — замінити на `unknown` де можливо, зберігши сумісність з Recharts API.

### Категорія C: ESLint помилки і warnings

- [ ] **C1.** `packages/simplycms/core/src/pages/Catalog.tsx:117` — **error** `prefer-const`: `let resolved` повинен бути `const`.

- [ ] **C2.** `packages/simplycms/core/src/pages/NotFound.tsx:18` — **error** `@next/next/no-html-link-for-pages`: замінити `<a>` на `<Link>` з `next/link`.

- [ ] **C3.** `react-hooks/set-state-in-effect` warnings (13 місць) — `setState` всередині `useEffect` без callback-патерну. Зачеплені компоненти:
  - Admin: `AllProductProperties`, `ProductPricesEditor`, `ProductPropertyValues`, `StockByPointManager`, `BannerEdit`, `DiscountEdit`, `OrderDetail`, `ProductEdit`, `PropertyEdit`, `PropertyOptionEdit`, `SectionEdit`, `ThemeSettings`
  - Core: `FilterSidebar`, `CheckoutDeliveryForm`, `CheckoutRecipientForm`, `useCart`
  - Theme: `BannerSlider`
  
  Потрібно: рефакторнути ці ефекти — використовувати useMemo для derived state, або ініціалізувати state через useState initializer, або useCallback. НЕ маскувати через eslint-disable.

- [ ] **C4.** `react-hooks/static-components` — компоненти створюються під час рендеру:
  - `ReviewRichTextEditor.tsx` — `ToolbarButton` визначений всередині рендер-функції → винести за межі компонента
  - `ActiveFilters.tsx` — `Button` визначений всередині рендер-функції → винести за межі або прийняти через пропс

- [ ] **C5.** `@typescript-eslint/no-unused-vars` warnings (~20 місць) — видалити невикористовувані імпорти і змінні. Перелік файлів:
  - `ImageUpload.tsx` (GripVertical, ImageIcon, e)
  - `InstallPluginDialog.tsx` (installPlugin)
  - `RichTextEditor.tsx` (placeholder)
  - `StockByPointManager.tsx` (StockRecord)
  - `DiscountEdit.tsx` (conditionTypeLabels)
  - `Discounts.tsx` (ToggleLeft, ToggleRight, router, hasChildren)
  - `OrderStatuses.tsx` (GripVertical)
  - `PickupPointEdit.tsx` (CardDescription)
  - `PluginSettings.tsx` (ParsedPlugin)
  - `Products.tsx` (Product)
  - `Reviews.tsx` (useMutation, useQueryClient, Button, Input)
  - `Settings.tsx` (Button)
  - `UserEdit.tsx` (router)
  - `CatalogLayout.tsx` (Settings, LogOut, renderButton)
  - `FilterSidebar.tsx` (handlePriceChange)
  - `ProductReviews.tsx` (userReview)
  - `ReviewRichTextEditor.tsx` (placeholder)
  - `use-toast.ts` (actionTypes)
  - `Auth.tsx` (error ×3)
  - `ProfileSettings.tsx` (Separator)
  - `calendar.tsx` (props)

- [ ] **C6.** `jsx-a11y/alt-text` warnings (5 місць) — додати `alt` атрибут до зображень:
  - `ProductModifications.tsx:421`
  - `Banners.tsx:80`
  - `Products.tsx:121`
  - `Sections.tsx:105`
  - `BlogPreview.tsx:43`
  - `ProductCard.tsx:52` (в themes/default)
  - `ProductCard.tsx:52` (в core/components/catalog)

- [ ] **C7.** `@next/next/no-assign-module-variable` — змінна `module` перезаписується:
  - `InstallPluginDialog.tsx` (рядки 51, 114)
  - `PluginSettings.tsx` (рядок 51)
  - `PluginLoader.ts` (рядки 36, 59, 89)
  - `ThemeRegistry.ts` (рядок 60)
  
  Перейменувати локальну змінну `module` на `pluginModule` / `themeModule`. Це зарезервоване ім'я в Next.js.

- [ ] **C8.** `react-hooks/exhaustive-deps` warnings:
  - `ImageUpload.tsx:118` — missing dependency `handleFileSelect`
  - `CheckoutDeliveryForm.tsx:219` — missing dependency `onChange`
  - `CheckoutRecipientForm.tsx:67,199` — missing dependencies
  
  Виправити або через додавання deps, або через useCallback для стабільних refs.

- [ ] **C9.** `react-hooks/incompatible-library` — `form.watch()` з react-hook-form:
  - `ShippingMethodEdit.tsx:128`
  - `UserCategoryRuleEdit.tsx:452`
  
  Розглянути заміну на `useWatch` hook або ignore з обґрунтованим коментарем.

- [ ] **C10.** `react-hooks/purity` — `Math.random()` в `sidebar.tsx:538` — замінити на стабільний seed або CSS-based рандомізацію.

- [ ] **C11.** `@typescript-eslint/no-unused-expressions` — `Discounts.tsx:131` — expression statement без виклику.

### Категорія D: Middleware → Proxy міграція (Next.js 16)

- [ ] **D1.** Мігрувати `middleware.ts` на новий `proxy` file convention Next.js 16. Перевірити точний API через MCP context7 (Next.js 16 migration guide, proxy file convention). Включити:
  - Auth guards для `/admin` (admin role check)
  - Auth guards для `/profile` (auth check)
  - Redirect `/auth` для автентифікованих
  - Supabase cookie session refresh
  
- [ ] **D2.** Оновити або видалити `packages/simplycms/core/src/supabase/middleware.ts` (helper `createMiddlewareSupabaseClient`) відповідно до нового proxy API.

- [ ] **D3.** Перевірити `next.config.ts` на deprecated/removed options для Next.js 16 через MCP context7.

### Категорія E: Модернізація та підсилення типізації

- [ ] **E1.** Після усунення всіх `any`, увімкнути ESLint правило `@typescript-eslint/no-explicit-any` хоча б як `"warn"` в `eslint.config.mjs`. Цільовий стан — `"error"`.

- [ ] **E2.** Оновити `peerDependencies` в `packages/simplycms/core/package.json` — `"next": "^15.0.0"` → `"^16.0.0"` (або `"^15.0.0 || ^16.0.0"`), щоб відповідало фактично встановленій версії.

- [ ] **E3.** Перевірити `@supabase/ssr` на сумісність з Next.js 16 через MCP context7, оновити за потреби.

---

## Clarify (питання перед імплементацією)

- [ ] **Q1.** Який контракт для SSR → Client page data passing?
  - Чому це важливо: визначає, чи core page компоненти повинні приймати SSR-дані через пропси (`initialData` для React Query) чи залишатися повністю клієнтськими
  - Варіанти: (A) Додати optional props з `initialData` в React Query — потрібне для SEO та швидкого FCP. (B) Видалити SSR-prefetch і покластися на client-only fetch.
  - Вплив на рішення: архітектура сторінок, SEO, ThemePages контракт
  - **Рекомендація**: варіант A — це рекомендований BRD-підхід (SSR+ISR для storefront)

- [ ] **Q2.** Як саме Next.js 16 proxy file convention працює для auth guards?
  - Чому це важливо: повна зміна auth flow
  - Варіанти: перевірити через MCP context7
  - Вплив на рішення: архітектура / безпека

- [ ] **Q3.** Чи `@supabase/ssr` 0.8 підтримує Next.js 16 proxy / чи потрібен апдейт?
  - Чому це важливо: без цього auth може повністю зламатися
  - Варіанти: перевірити через MCP context7 + supabase docs
  - Вплив на рішення: залежності, auth flow

- [ ] **Q4.** Чи є в DB default для `order_number` (для guest-order route)?
  - Чому це важливо: `order_number` — required поле в `TablesInsert<'orders'>`
  - Варіанти: (A) DB trigger/default, (B) генерація на стороні API
  - Вплив на рішення: дані

- [ ] **Q5.** Properties routing: таблиці `properties` та `property_values` не існують. Потрібна заміна на `section_properties` / `property_options`. Чи коректна бізнес-логіка цих сторінок? Або вони були створені під стару схему і потребують більш глибокої переробки?
  - Вплив на рішення: дані, UI

---

## Рекомендовані патерни

### Типізація Supabase select з join'ами
Замість `(p.sections as any).slug` — використовувати вбудований тип Supabase PostgREST. Коли `.select("..., sections!FK(slug)")`, результат вже типізований — потрібно правильно destructure.
- Де шукати приклад: `supabase/types.ts` → Relationships секції таблиці `products`

### Типізація результатів через Database helper types
Для select-результатів використовувати `Tables<'products'>` для повного рядка, або утилітний тип на основі `Database['public']['Tables']['products']['Row']`.
- Де шукати приклад: `packages/simplycms/core/src/supabase/types.ts` — re-exports

### `catch (error: unknown)` + type guard
Замість `catch (error: any)` — `catch (error: unknown)` з `error instanceof Error ? error.message : 'Unknown error'`.
- Де шукати приклад: `app/api/health/route.ts:54` — вже використовує цей патерн

### Zod 4 API
В Zod 4: `.issues` замість `.errors`, `{ error: ... }` замість `{ required_error: ... }`, `z.safeParse` повертає `{ success, data }` або `{ success, error }` де `error` це `ZodError` з `.issues`.
- Де шукати: MCP context7 → Zod 4 documentation

### Derived state замість setState в useEffect
Замість `useEffect(() => { setState(computeFromProps(props)) }, [props])` — використовувати `useMemo(() => computeFromProps(props), [props])` або useState з initializer.
- Де шукати приклад: React documentation, "You Might Not Need an Effect"

### Proxy file convention (Next.js 16)
Замість `middleware.ts` з `export function middleware()` — новий `proxy.ts` з відповідним API.
- Де шукати: MCP context7 → Next.js 16 migration, proxy file convention

---

## Антипатерни (уникати)

### ❌ `as any` для обходу Supabase типів
Причина: маскує реальну невідповідність між кодом і DB-схемою. Якщо поле не існує в типі — це сигнал що запит або доступ до поля неправильний. Виправляти потрібно select/from, а не кастити.

### ❌ `as unknown as SomeType` для Supabase результатів
Причина: обходить type safety і приховує помилки. Якщо Supabase повертає неправильний тип — вирішувати через правильний `.select()` з правильними join'ами, а не кастити.

### ❌ TypeScript `any` в strict mode проекті
Правило проекту: заборонено. Використовувати `unknown` + type guards, generics, або конкретні типи.

### ❌ Створення адаптерів/обгорток для маскування проблем типізації
Не створювати "converter" функції що кастять `any` під капотом. Адресувати першопричину — невідповідність Supabase-запитів і DB-типів.

### ❌ eslint-disable для приховування реальних код-проблем
Допускається лише `eslint-disable-next-line react-hooks/exhaustive-deps` з пояснюючим коментарем ЧОМУ залежність навмисно виключена. Всі інші disable — заборонені.

### ❌ Компоненти всередині рендер-функцій
Створення компонентів (через function або const) всередині іншого компонента рендеру — веде до перестворення стану при кожному рендері. Виносити за межі компонента або у helper-файл.

### ❌ setState в useEffect для computed/derived state
Якщо стан безпосередньо виводиться з існуючих props/state — це derived state, не потрібен окремий useState + useEffect. Використовувати useMemo.

---

## Архітектурні рішення

- **Пакети**: виправлення розподіляються по `@simplycms/core` (pages, hooks, components), `@simplycms/admin` (admin pages/components), `@simplycms/ui` (chart), `@simplycms/plugins` (PluginLoader), `@simplycms/themes` (ThemeRegistry), `app/` (SSR pages, API routes, middleware→proxy), `themes/` (theme pages/components)
- **Rendering стратегія**: SSR+ISR для storefront (залишається), Client-only для admin (залишається), proxy для auth guards (новий)
- **Міграція з temp/**: не потрібна — проблеми в вже мігрованому коді

---

## MCP Servers (обов'язково)

- **context7** — для перевірки API:
  - Next.js 16 proxy migration та deprecated API
  - Zod 4 API (`.issues`, params для `.enum()`, `.refine()`)
  - `@hookform/resolvers` 5.x сумісність з Zod 4
  - `@supabase/ssr` сумісність з Next.js 16
  - React `queueMicrotask` signature
- **supabase** — для перевірки:
  - Структура таблиць `section_properties`, `property_options`, `orders` (поля та relationships)
  - Чи є default для `order_number`
  - Правильні join-шляхи для `.select()` запитів
- **shadcn** — якщо будуть зміни в UI компонентах (chart.tsx)

---

## Пов'язана документація

- `BRD_SIMPLYCMS_NEXTJS.md` секція 7 — система тем (ThemeModule, ThemePages)
- `BRD_SIMPLYCMS_NEXTJS.md` секція 9 — SSR стратегія, ISR revalidation, Server/Client Components
- `BRD_SIMPLYCMS_NEXTJS.md` секція 10 — автентифікація, Supabase SSR, middleware
- `.github/instructions/data-access.instructions.md` — Supabase клієнти, типи, міграції
- `.github/instructions/coding-style.instructions.md` — заборона `any`, стиль коду
- `.github/instructions/optimization.instructions.md` — SSR/ISR, React Query caching
- `supabase/types.ts` — актуальні DB-типи (згенеровані)
- `packages/simplycms/theme-system/src/types.ts` — ThemeModule, ThemePages контракт

---

## Порядок виконання

1. **Спочатку D1-D3** (proxy міграція) — бо блокує build warning і має найбільший архітектурний вплив
2. **Потім A1-A11** (TS errors) — фіксять build
3. **Потім B1-B17** (any cleanup) — type safety
4. **Потім C1-C11** (lint warnings) — code quality
5. **Наприкінці E1-E3** (modernization) — підсилення правил

---

## Definition of Done

- [ ] `pnpm typecheck` — 0 помилок
- [ ] `pnpm lint` — 0 errors, 0 warnings (або мінімум warnings з обґрунтованими eslint-disable)
- [ ] `pnpm build` — успішний без warnings про deprecated middleware
- [ ] Жодного `any` в `app/`, `packages/`, `themes/` (крім `temp/`)
- [ ] Жодного `as unknown as` без обґрунтованого коментаря
- [ ] `@typescript-eslint/no-explicit-any` увімкнений як `"warn"` в ESLint
- [ ] Auth guards працюють через новий proxy mechanism
- [ ] SSR-сторінки storefront передають initialData і це відображається в HTML (SEO)
- [ ] Всі зображення мають `alt` атрибут
- [ ] Немає компонентів створених всередині рендер-функцій
