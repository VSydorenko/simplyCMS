# Task: Перемикання тем в адмінці + SSR theme resolution для storefront

## Контекст

Після міграції з Vite SPA на Next.js система тем частково працює: є `ThemeRegistry` (реєстрація модулів у build), `ThemeContext` (клієнтське завантаження активної теми з БД), адмін-сторінка тем (CRUD в `public.themes`). Проте **переключення теми в адмінці не впливає на storefront**, бо:

1. **SolarStore відсутній у БД** — seed-міграція вставляє лише запис `default`. SolarStore зареєстрований у `ThemeRegistry` (код є в build), але не "встановлений" у таблицю `themes` → його немає в списку адмінки для перемикання.
2. **Storefront хардкодить імпорти `@themes/default/...`** — сторінки в `app/(storefront)/` напряму імпортують компоненти дефолтної теми, ігноруючи `ThemeRegistry` і значення `is_active` у БД.
3. **Відсутній SSR theme resolver** — BRD описує `getActiveTheme()` для Server Components, але поточна реалізація — клієнтський `ThemeContext` з `useEffect` + browser Supabase, який працює тільки після гідрації.

### Діагностика поточного стану

| Компонент | Де | Стан | Проблема |
|-----------|-----|------|----------|
| `ThemeRegistry.register()` | `app/providers.tsx` | ✅ `default` + `solarstore` зареєстровані | — |
| `public.themes` seed | міграція `20260209...` | ⚠️ тільки `default` | SolarStore не вставлений |
| `InstallThemeDialog` | адмін-панель | ✅ дозволяє "встановити" тему з Registry | Ручний процес, не auto-sync |
| `ThemeContext.fetchActiveTheme()` | `theme-system/ThemeContext.tsx` | ✅ читає `is_active` з БД (browser client) | Не SSR, працює після гідрації |
| Storefront pages | `app/(storefront)/*.tsx` | ❌ хардкод `@themes/default/pages/*` | Ігнорують активну тему |
| Storefront layout | `app/(storefront)/layout.tsx` | ❌ хардкод `@themes/default/layouts/StorefrontShell` | Ігнорує активну тему |
| `getActiveTheme()` | `theme-system/index.ts` | ⚠️ обгортка над `getCached(name)` | Потребує `name`, не SSR-aware, не ходить у БД |

### Пов'язані файли

- `app/providers.tsx` — реєстрація тем у `ThemeRegistry` (site-specific)
- `app/(storefront)/layout.tsx` — hardcoded `StorefrontShell` з `@themes/default`
- `app/(storefront)/page.tsx` — hardcoded `HomePage` з `@themes/default`
- `app/(storefront)/catalog/page.tsx` — hardcoded `CatalogPage`
- `app/(storefront)/catalog/[sectionSlug]/page.tsx` — hardcoded `CatalogSectionPage`
- `app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx` — hardcoded `ProductPage`
- `app/(storefront)/properties/page.tsx` — hardcoded `PropertiesPage`
- `app/(storefront)/properties/[propertySlug]/page.tsx` — hardcoded `PropertyDetailPage`
- `app/(storefront)/properties/[propertySlug]/[optionSlug]/page.tsx` — hardcoded `PropertyOptionPage`
- `packages/simplycms/theme-system/src/index.ts` — поточний `getActiveTheme()`
- `packages/simplycms/theme-system/src/ThemeRegistry.ts` — singleton registry
- `packages/simplycms/theme-system/src/ThemeContext.tsx` — клієнтський provider (для CSS variables, settings)
- `packages/simplycms/theme-system/src/types.ts` — `ThemeModule`, `ThemePages`, `ThemeRecord`
- `supabase/migrations/20260209075414_...sql` — seed тільки `default`
- `themes/default/manifest.ts` — `name: 'default'`
- `themes/solarstore/manifest.ts` — `name: 'solarstore'`
- `packages/simplycms/admin/src/pages/Themes.tsx` — список встановлених тем, активація
- `packages/simplycms/admin/src/components/InstallThemeDialog.tsx` — встановлення теми з Registry в БД

---

## Вимоги

### Фаза 1: SolarStore доступний для перемикання в адмінці

- [ ] **1.1** Додати seed-міграцію для вставки `solarstore` у таблицю `themes` (як неактивну тему, `is_active=false`), з коректними `display_name`, `version`, `settings_schema` з маніфесту
- [ ] **1.2** Перевірити/виправити рассинхрон між seed-даними (`default` в БД зветься "SolarStore Default") і реальними маніфестами тем (`default` → "Default Theme", `solarstore` → "SolarStore Default")
- [ ] **1.3** Впевнитись, що після міграції обидві теми видно в адмінці `/admin/themes` і кнопка "Активувати" працює

### Фаза 2: SSR theme resolution для storefront

- [ ] **2.1** Створити серверну функцію `getActiveThemeSSR()` у `@simplycms/themes`, яка:
  - Читає `themes.is_active=true` через server-side Supabase client
  - Резолвить `ThemeModule` з `ThemeRegistry` за `record.name`
  - Має fallback на `"default"` якщо тема не знайдена/не registered
  - Підтримує кешування у рамках одного request (React `cache()` або module-level cache з TTL)
- [ ] **2.2** Замінити hardcoded імпорти в `app/(storefront)/layout.tsx` на динамічний layout з активної теми
- [ ] **2.3** Замінити hardcoded імпорти pages в усіх storefront-маршрутах на `getActiveThemeSSR()` + `theme.pages.*`
- [ ] **2.4** Зберегти існуюче передавання SSR-даних (props) у page-компоненти тем (banners, products, sections) — контракт `ThemePages` дозволяє `Record<string, unknown>` props
- [ ] **2.5** Зберегти `export const revalidate` та `generateMetadata()` в кожному маршруті — вони залишаються на рівні `app/`

### Фаза 3: Узгодження клієнтського ThemeContext з SSR

- [ ] **3.1** `ThemeContext` (клієнтський) залишається і далі потрібний для: CSS variables, `themeSettings`, `themeRecord`, `refreshTheme()` — але не повинен визначати яку тему рендерити
- [ ] **3.2** Після SSR-рендеру `ThemeContext` гідрується з тим же `themeName` що й сервер — уникати flash/mismatch
- [ ] **3.3** Розглянути передавання `initialThemeName` з SSR layout → `ThemeProvider` (щоб уникнути зайвого fetch на клієнті)

---

## Clarify (питання перед імплементацією)

- [ ] **Q1. ThemeRegistry на сервері: як працює синглтон?**
  - Чому це важливо: `ThemeRegistry` — це module-level singleton. У Next.js Server Components код виконується на сервері, але модулі кешуються між запитами (у dev — ні). `ThemeRegistry.register()` викликається зараз у `app/providers.tsx` ("use client") — на сервері цей код **не виконується**.
  - Варіанти:
    - A) Створити окремий `app/theme-registry.server.ts` з реєстрацією (без "use client"), імпортувати його з `getActiveThemeSSR()`
    - B) Зареєструвати теми в `next.config.ts` або `instrumentation.ts` (Next.js instrumentation hook)
    - C) `getActiveThemeSSR()` сам реєструє теми лениво при першому виклику
  - Вплив на рішення: архітектура, production vs dev поведінка

- [ ] **Q2. Кешування SSR theme resolution**
  - Чому це важливо: кожна storefront-сторінка викликатиме `getActiveThemeSSR()` → це DB запит на кожен рендер
  - Варіанти:
    - A) `React.cache()` — кешує в рамках одного запиту (per-request dedup)
    - B) `unstable_cache()` + revalidateTag — кешує між запитами, інвалідується при зміні теми в адмінці
    - C) Module-level cache з TTL (наприклад, 60s) — простіше, але stale дані
  - Вплив на рішення: продуктивність, свіжість даних після перемикання теми

- [ ] **Q3. Revalidation при зміні теми**
  - Чому це важливо: після `activateMutation` в адмінці потрібно щоб storefront почав рендерити нову тему
  - Варіанти:
    - A) On-demand revalidation: адмінка викликає API route `/api/revalidate?tag=active-theme` після перемикання
    - B) Time-based: `revalidate = 60` — нова тема з'явиться максимум через 60 секунд
    - C) Комбінований: `unstable_cache` з tag + on-demand revalidation для миттєвого перемикання
  - Вплив на рішення: UX (затримка після перемикання), складність

- [ ] **Q4. theme.css (стилі теми) — як перемикати?**
  - Чому це важливо: кожна тема має `styles/theme.css` з CSS variables. Зараз `import "./styles/theme.css"` у `themes/default/index.ts` бандлиться статично.
  - Варіанти:
    - A) CSS variables injection через `<style>` тег у layout (SSR) — динамічно на основі активної теми і `themeSettings`
    - B) Кожна тема має свій CSS file, який підключається через `<link>` у `<head>` (потребує public assets)
    - C) Тримати `import` в обох темах (обидва CSS завантажуються), а перемикання через CSS specificity / data-theme attribute
  - Вплив на рішення: CSS bundle size, FOUC, DX

- [ ] **Q5. StorefrontShell vs MainLayout**
  - Чому це важливо: зараз `app/(storefront)/layout.tsx` імпортує `StorefrontShell` з `@themes/default/layouts/`. У `ThemeModule` contract є `MainLayout` — це одне й те саме чи різне?
  - Потрібно уточнити: чи `StorefrontShell` = `MainLayout` (тоді перейменувати/уніфікувати), чи це обгортка навколо `MainLayout`
  - Вплив на рішення: які layouts тема має експортувати

---

## Рекомендовані патерни

### SSR Theme Resolution (Server-only utility)
Серверна async-функція, що читає БД → резолвить ThemeModule з Registry → повертає повний об'єкт теми. Використовує `React.cache()` або `unstable_cache()` для dedup/кешування. Fallback на `"default"` при помилці.
- Де шукати приклад: BRD секція 7.2, `packages/simplycms/theme-system/src/ThemeResolver.ts`

### Server-side Theme Registration
Реєстрація доступних тем у контексті серверного рендеру (не "use client"). Може бути окремий файл або lazy-ініціалізація всередині `getActiveThemeSSR()`.
- Де шукати приклад: `app/providers.tsx` (поточна клієнтська реєстрація), адаптувати для server

### Dynamic Theme Page Rendering
Storefront page.tsx як Server Component робить `const theme = await getActiveThemeSSR()` → `const Page = theme.pages.HomePage` → `return <Page {...ssrProps} />`. Серверні дані (props) залишаються на рівні route page.tsx.
- Де шукати приклад: BRD секція 7.2 (концептуальний приклад)

### On-demand Revalidation After Theme Switch
Адмінка після `activateMutation.onSuccess` викликає `/api/revalidate` з відповідним tag → `revalidateTag('active-theme')` → наступний запит до storefront отримає нову тему.
- Де шукати приклад: `app/api/revalidate/route.ts` (вже існує)

### Theme Settings Hydration (Client)
`ThemeContext` отримує `initialThemeName` з SSR → уникає зайвого fetch. CSS variables застосовуються на клієнті через існуючий `useEffect` у `ThemeContext`.
- Де шукати приклад: `packages/simplycms/theme-system/src/ThemeContext.tsx`

---

## Антипатерни (уникати)

### ❌ Динамічний `import()` на основі рядка з БД без Registry
Не робити `import(\`@themes/${dbThemeName}/index\`)` напряму — це порушує webpack static analysis, не працює на Vercel, і обходить валідацію ThemeRegistry. Тільки pre-registered loaders.

### ❌ Подвійний рендер (SSR fallback → client re-render з іншою темою)
Якщо SSR рендерить `default`, а клієнт через ThemeContext виявляє `solarstore` — буде flash. Треба щоб SSR вже знав правильну тему.

### ❌ Бізнес-логіка в темах
Теми — чиста візуалізація. Fetching даних, enrichment, price resolution — це рівень `app/` page.tsx або `@simplycms/core`. Тема отримує готові props.

### ❌ `"use client"` у SSR theme resolver
`getActiveThemeSSR()` має бути server-only. Не додавати `"use client"` — це серверна функція з `createServerSupabaseClient()`.

### ❌ Видалення ThemeContext повністю
`ThemeContext` все ще потрібний для клієнтських потреб: CSS variables, dynamic settings, `refreshTheme()` для адмінки. Не видаляти, а розмежувати відповідальності: SSR → визначає тему, Client → застосовує settings.

### ❌ Seed-міграція з `is_active=true` для обох тем
Constraint `themes_active_idx` дозволяє тільки одну активну тему. Не вставляти дві з `is_active=true` — міграція впаде.

### ❌ Зберігання theme module code в БД
Теми — це код у build. БД зберігає тільки: яка активна, налаштування (config), метадані. Нова тема = новий код + deploy.

---

## Архітектурні рішення

- **Фаза 1 (seed):** міграція в `supabase/migrations/` (project-level)
- **Фаза 2 (SSR resolver):** `@simplycms/themes` (`packages/simplycms/theme-system/src/`)
- **Фаза 2 (storefront pages):** `app/(storefront)/` (site-level, використовує API з `@simplycms/themes`)
- **Фаза 3 (ThemeContext sync):** `@simplycms/themes` (`ThemeContext.tsx`)
- Rendering стратегія storefront: **SSR + ISR** (без змін — тільки джерело компонентів стає динамічним)
- Rendering стратегія admin themes page: **Client-only** (без змін)
- Реєстрація тем (site-specific): залишається в `app/` (реєструє які модулі доступні у build)
- Міграція з `temp/`: не застосовується (це нова логіка для Next.js, а не порт)

---

## MCP Servers (за потреби)

- **context7** — для перевірки актуальних API:
  - Next.js `unstable_cache`, `revalidateTag`, `React.cache()`
  - Next.js `instrumentation.ts` hook
  - Dynamic imports у Server Components
- **supabase** — для перевірки seed-міграції та типів після зміни схеми
- **shadcn** — не потрібен для цієї задачі

---

## Пов'язана документація

- `BRD_SIMPLYCMS_NEXTJS.md` секція 7 — система тем (ThemeModule, ThemeManifest, ThemePages, як тема підключається до app/)
- `BRD_SIMPLYCMS_NEXTJS.md` секція 6.2 — структура app/ (route groups, rendering стратегії)
- `.github/instructions/architecture-core.instructions.md` — правила архітектури, rendering стратегії по route groups
- `.github/instructions/ui-architecture.instructions.md` — система тем, ThemeModule contract, приклад SSR getActiveTheme()
- `packages/simplycms/theme-system/src/` — поточна реалізація (ThemeRegistry, ThemeContext, ThemeResolver, types)
- `themes/default/` — еталонна тема (manifest, pages, layouts, components)
- `themes/solarstore/` — друга тема для перемикання
- `app/providers.tsx` — реєстрація тем (site-specific)
- `supabase/migrations/20260209075414_...sql` — seed `themes` таблиці

---

## Definition of Done

### Фаза 1
- [ ] Обидві теми (`default` і `solarstore`) відображаються на сторінці `/admin/themes`
- [ ] Кнопка "Активувати" перемикає активну тему в БД
- [ ] Імена та описи тем у БД відповідають маніфестам (`themes/*/manifest.ts`)

### Фаза 2
- [ ] Storefront SSR рендерить сторінки з **активної** теми (не hardcoded `default`)
- [ ] Після перемикання теми в адмінці → storefront відображає нову тему (з допустимою затримкою revalidation)
- [ ] Усі 8+ storefront-маршрутів використовують `getActiveThemeSSR()` замість прямих імпортів
- [ ] Fallback: якщо активна тема не знайдена в Registry → рендер `default`
- [ ] Існуючі SSR-дані (banners, products, sections) продовжують передаватись як props
- [ ] ISR revalidation працює як раніше (`export const revalidate`)

### Фаза 3
- [ ] Немає flash/mismatch між SSR-рендером і клієнтською гідрацією
- [ ] CSS variables активної теми застосовуються коректно
- [ ] `ThemeContext.themeName` відповідає SSR-рендеру

### Загальне
- [ ] Лінтинг без помилок (`pnpm lint`)
- [ ] Typecheck проходить (`pnpm typecheck`)
- [ ] Немає console errors у browser dev tools
- [ ] Clarify-питання вирішені або задокументовані як прийняті рішення
