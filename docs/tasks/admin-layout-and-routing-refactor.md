# Task: Рефакторинг layout-системи та routing адмін-панелі

## Контекст
Після міграції з Vite SPA (React Router) на Next.js App Router адмін-панель має дві системні проблеми:
1. **Layout**: сайдбар візуально "не співставляється" з основним контентом — кастомний wrapper не використовує `SidebarInset` з shadcn/ui, тому CSS-механізм `peer-data-[...]` не працює.
2. **Routing**: усі detail/edit сторінки мають зайвий сегмент `/edit` у файловій структурі (спадщина react-router), через що URL-и з компонентів-списків (`/admin/.../\${id}`) ведуть на неіснуючі маршрути → 404.
3. **"new" маршрути**: компоненти посилаються на `/admin/.../new`, але route-файли для `/new` не існують (єдиний виняток — `products/new/page.tsx`). У Next.js App Router "new" має бути спеціальним значенням dynamic param (`[id] === "new"`), а не окремим маршрутом.

Зв'язок з BRD: секція 5 (Admin Panel), секція 9 (Rendering strategies — admin = client-only SPA).

## Вимоги

### Layout
- [x] Замінити кастомний `div.flex-1.flex.flex-col` wrapper у `AdminLayout` на `SidebarInset` з `@simplycms/ui/sidebar`
- [x] Перевірити що header та main залишаються всередині `SidebarInset`
- [ ] Перевірити коректну роботу collapse/expand сайдбару після рефакторингу (ручне тестування)
- [ ] Перевірити мобільну версію (Sheet-based sidebar) (ручне тестування)

### Routing — прибрати `/edit` сегмент
- [x] Перемістити усі `[param]/edit/page.tsx` → `[param]/page.tsx` (видалити папку `edit/`)
- [x] Повний список файлів для переміщення (14 файлів, themes/plugins залишено з /settings):
  - `app/(cms)/admin/sections/[sectionId]/edit/page.tsx` → `[sectionId]/page.tsx`
  - `app/(cms)/admin/properties/[propertyId]/edit/page.tsx` → `[propertyId]/page.tsx`
  - `app/(cms)/admin/properties/[propertyId]/options/[optionId]/edit/page.tsx` → `[optionId]/page.tsx`
  - `app/(cms)/admin/products/[productId]/edit/page.tsx` → `[productId]/page.tsx`
  - `app/(cms)/admin/price-types/[priceTypeId]/edit/page.tsx` → `[priceTypeId]/page.tsx`
  - `app/(cms)/admin/banners/[bannerId]/edit/page.tsx` → `[bannerId]/page.tsx`
  - `app/(cms)/admin/discounts/[discountId]/edit/page.tsx` → `[discountId]/page.tsx`
  - `app/(cms)/admin/discounts/groups/[groupId]/edit/page.tsx` → `[groupId]/page.tsx`
  - `app/(cms)/admin/users/[userId]/edit/page.tsx` → `[userId]/page.tsx`
  - `app/(cms)/admin/user-categories/[categoryId]/edit/page.tsx` → `[categoryId]/page.tsx`
  - `app/(cms)/admin/user-categories/rules/[ruleId]/edit/page.tsx` → `[ruleId]/page.tsx`
  - `app/(cms)/admin/shipping/methods/[methodId]/edit/page.tsx` → `[methodId]/page.tsx`
  - `app/(cms)/admin/shipping/zones/[zoneId]/edit/page.tsx` → `[zoneId]/page.tsx`
  - `app/(cms)/admin/shipping/pickup-points/[pointId]/edit/page.tsx` → `[pointId]/page.tsx`
  - ~~`app/(cms)/admin/themes/[themeId]/settings/page.tsx` → `[themeId]/page.tsx`~~ — залишено `/settings` за рішенням експерта
  - ~~`app/(cms)/admin/plugins/[pluginId]/settings/page.tsx` → `[pluginId]/page.tsx`~~ — залишено `/settings` за рішенням експерта
- [x] Видалити порожні папки `edit/` після переміщення (settings/ залишено для themes/plugins)

### Routing — "new" як значення dynamic param
- [x] Видалити `app/(cms)/admin/products/new/page.tsx` — цей маршрут стане непотрібним після переміщення `[productId]/edit/page.tsx` → `[productId]/page.tsx`, бо `productId === "new"` покриє цей кейс
- [x] Переконатися що у всіх Edit-компонентах `isNew` перевірка коректно працює з param === "new":
  - `ProductEdit`: `isNew = productId === "new"` — OK
  - `SectionEdit`: `isNew = sectionId === "new"` — OK
  - `ShippingMethodEdit`: `isNew = methodId === "new"` — OK
  - `ShippingZoneEdit`: `isNew = zoneId === "new"` — OK
  - `PickupPointEdit`: `isNew = pointId === "new"` — OK
  - `PropertyEdit`: немає isNew — тільки edit, OK (options всередині)
  - `PropertyOptionEdit`: `isNew = optionId === "new"` — OK
  - `BannerEdit`: `isNew = !bannerId || bannerId === "new"` — OK
  - `DiscountEdit`: `isNew = !discountId || discountId === "new"` — OK
  - `DiscountGroupEdit`: `isNew = !groupId || groupId === "new"` — OK
  - `PriceTypeEdit`: ~~`isNew = pathname.endsWith("/new") || !priceTypeId`~~ → **ВИПРАВЛЕНО**: `isNew = !priceTypeId || priceTypeId === "new"`
  - `UserCategoryEdit`: ~~`isNew = pathname.endsWith("/new") || !categoryId`~~ → **ВИПРАВЛЕНО**: `isNew = !categoryId || categoryId === "new"`
  - `UserCategoryRuleEdit`: ~~`isNew = pathname.endsWith("/new") || !ruleId`~~ → **ВИПРАВЛЕНО**: `isNew = !ruleId || ruleId === "new"`

### Routing — перевірити навігацію зі списків
- [x] Переконатися що всі `router.push` та `Link href` з компонентів-списків ведуть на коректні маршрути (без `/edit`):
  - Більшість вже навігують на `/admin/.../\${id}` — це стане правильним після рефакторингу
  - ~~Виняток: `Themes.tsx` навігує на `/admin/themes/\${id}`~~ → **ВИПРАВЛЕНО**: навігує на `/admin/themes/\${id}/settings`
  - ~~Виняток: `Plugins.tsx` навігує на `/admin/plugins/\${id}`~~ → **ВИПРАВЛЕНО**: навігує на `/admin/plugins/\${id}/settings`

### UX — loading states
- [x] Додати `loading.tsx` у `app/(cms)/admin/` для instant loading state між навігацією сторінок адмін-панелі

## Clarify (вирішено)
- [x] Чи потрібен окремий "view" mode для будь-якої сутності? → **НІ**, все по одному стандарту
- [x] Чи themes та plugins семантично потребують `/settings` у URL? → **ТАК**, залишено `/settings` для можливості розширення (preview, customize)

## Рекомендовані патерни

### Dynamic param як "new" (Next.js-native)
В App Router `[param]` природно приймає будь-яке значення, включаючи "new". Edit-компонент перевіряє `param === "new"` і показує пусту форму або завантажує дані. Не потрібні окремі `/new/page.tsx`.
- Де шукати приклад: `packages/simplycms/admin/src/pages/ProductEdit.tsx` (isNew = productId === "new")
- Де шукати приклад: `packages/simplycms/admin/src/pages/ShippingMethodEdit.tsx` (isNew = methodId === "new")

### SidebarInset замість кастомного wrapper
shadcn/ui Sidebar використовує CSS-механізм `peer`/`peer-data-[state=...]` для синхронізації ширини sidebar і main area. Компонент `SidebarInset` — це `<main>` з правильними utility-класами.
- Де шукати приклад: `packages/simplycms/ui/src/sidebar.tsx` (компонент SidebarInset)
- shadcn docs: sidebar component examples

### Thin page files (поточний патерн — зберігати)
Кожен `page.tsx` в `app/(cms)/admin/` — це thin wrapper з `dynamic(() => import(...), { ssr: false })`. Вся бізнес-логіка у `@simplycms/admin/pages/*`. Цей патерн зберігається.
- Де шукати приклад: `app/(cms)/admin/shipping/methods/page.tsx`

### isNew через порівняння param (уніфікувати)
Замість `pathname.endsWith("/new")` використовувати `param === "new"`. Це працює незалежно від URL-структури і є єдиним Next.js-native способом.
- Де шукати приклад: `packages/simplycms/admin/src/pages/SectionEdit.tsx`

## Антипатерни (уникати)

### ❌ Дублювання route-файлів (alias pages)
Не створювати `[id]/page.tsx` як alias для `[id]/edit/page.tsx`. Це подвоює кількість файлів і створює плутанину в маршрутизації.

### ❌ Залишати `/edit` у URL для CMS-адмінки
В SPA з react-router був сенс розділяти `/view` і `/edit`. В Next.js App Router для CMS-адмінки (client-only, SPA-behaviour) кожна detail-сторінка IS edit-сторінка. Зайвий сегмент ламає навігацію та ускладнює URL.

### ❌ Окремі `/new/page.tsx` маршрути
В попередній SPA-архітектурі "new" міг бути окремим маршрутом. У Next.js dynamic segment `[id]` вже приймає "new" як значення — окремий файл дублює логіку і може конфліктувати з dynamic route.

### ❌ pathname.endsWith для визначення isNew
`usePathname()` повертає повний URL-шлях. Перевірка `endsWith("/new")` — крихка: ламається при зміні URL-структури, при query params, тощо. Замість цього порівнювати значення dynamic param напряму.

### ❌ Кастомні div-обгортки замість SidebarInset
shadcn/ui Sidebar працює через CSS `peer` і `fixed` позиціонування. Кастомний `div.flex-1` не реагує на стан sidebar (collapsed/expanded). Тільки `SidebarInset` має правильні `peer-data-[...]` утиліти.

## Архітектурні рішення
- В який пакет додавати код: зміни в `app/(cms)/admin/` (route-файли) + `@simplycms/admin` (AdminLayout, isNew-фікси)
- Rendering стратегія: Client-only (всі файли `'use client'` + `dynamic(..., { ssr: false })`)
- Міграція з temp/: не потрібна — компоненти вже мігровані, потрібен лише рефакторинг маршрутів

## MCP Servers (за потреби)
- **context7** — для перевірки API `useParams`, `usePathname`, dynamic routes conventions, `SidebarInset`
- **shadcn** — для перевірки sidebar component API та SidebarInset usage examples

## Пов'язана документація
- `BRD_SIMPLYCMS_NEXTJS.md` секція 5 — Admin Panel architecture
- `BRD_SIMPLYCMS_NEXTJS.md` секція 9 — Rendering strategies (admin = client-only)
- `.github/instructions/architecture-core.instructions.md` — rendering стратегії за route groups
- `.github/instructions/ui-architecture.instructions.md` — UI компоненти, sidebar
- `packages/simplycms/ui/src/sidebar.tsx` — SidebarInset implementation
- `packages/simplycms/admin/src/layouts/AdminLayout.tsx` — поточний layout (потребує рефакторингу)
- `packages/simplycms/admin/src/layouts/AdminSidebar.tsx` — sidebar navigation links

## Definition of Done
- [x] Сайдбар коректно синхронізується з main area (collapse/expand/mobile) — SidebarInset замість кастомного wrapper
- [x] Усі detail-сторінки відкриваються при кліку зі списків (жодних 404) — маршрути виправлені
- [x] Створення нових сутностей (`/admin/.../new`) працює для всіх ресурсів — dynamic param покриває
- [x] Жоден `pathname.endsWith("/new")` не залишається — уніфіковано на `param === "new"`
- [x] Папки `edit/` видалені з route-структури; `settings/` залишено для themes/plugins
- [x] `products/new/page.tsx` видалено
- [x] `loading.tsx` для admin route group додано
- [x] Лінтинг без помилок (`pnpm lint`)
- [x] TypeScript без помилок (`pnpm typecheck`)
- [ ] Ручне тестування: навігація між списком і detail для кожної сутності
