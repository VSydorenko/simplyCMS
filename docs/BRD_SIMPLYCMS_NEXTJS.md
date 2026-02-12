# SimplyCMS — Business Requirements Document (BRD)

## Конвертація в Next.js SSR-first CMS з модульною архітектурою

**Версія документу:** 1.0
**Дата:** 2026-02-11
**Автор:** VSydorenko + Claude AI
**Репозиторій:** https://github.com/VSydorenko/simplyCMS

---

## Зміст

1. [Огляд проекту](#1-огляд-проекту)
2. [Поточний стан](#2-поточний-стан)
3. [Цільова архітектура](#3-цільова-архітектура)
4. [Структура репозиторіїв](#4-структура-репозиторіїв)
5. [Git Subtree workflow](#5-git-subtree-workflow)
6. [Детальна структура проекту](#6-детальна-структура-проекту)
7. [Система тем](#7-система-тем)
8. [Система плагінів](#8-система-плагінів)
9. [SSR-стратегія для публічних сторінок](#9-ssr-стратегія-для-публічних-сторінок)
10. [Автентифікація та авторизація](#10-автентифікація-та-авторизація)
11. [База даних та міграції](#11-база-даних-та-міграції)
12. [План міграції з поточного проекту](#12-план-міграції-з-поточного-проекту)
13. [Marketplace (майбутній розвиток)](#13-marketplace-майбутній-розвиток)
14. [Технічні вимоги](#14-технічні-вимоги)
15. [Ризики та обмеження](#15-ризики-та-обмеження)

---

## 1. Огляд проекту

### 1.1 Що таке SimplyCMS

SimplyCMS — open-source e-commerce CMS-платформа на базі Next.js з SSR-first підходом для публічних сторінок. Система надає:

- **Ядро (Core)** — адмін-панель, система плагінів, система тем, data-layer, міграції БД
- **Теми** — візуальна складова магазину, яку можна замінювати та кастомізувати
- **Плагіни** — розширення функціональності через hook-систему

### 1.2 Ключові принципи

1. **SSR-first** — публічні сторінки рендеряться на сервері для SEO та швидкості
2. **Модульність** — ядро, теми та плагіни розділені і можуть розвиватися незалежно
3. **Git-native** — ядро розповсюджується через Git Subtree, оновлення через git-команди
4. **Supabase-based** — PostgreSQL + Auth + Storage + Edge Functions як бекенд
5. **Open Source** — ядро є відкритим, спільнота може контриб'ютити

### 1.3 Цільова аудиторія

| Роль | Потреба |
|------|---------|
| **Власник магазину** | Клонувати стартер, налаштувати тему, запустити магазин |
| **Розробник тем** | Створити кастомну візуальну складову на базі ядра |
| **Розробник плагінів** | Розширити функціональність через hook-систему |
| **Core-контриб'ютор** | Вносити зміни в ядро та відправляти PR |

---

## 2. Поточний стан

### 2.1 Референсний проект

Поточний проект (React SPA + Vite) буде розміщений в директорії `./temp` як референс для міграції. Це означає:

- **Не розробляємо заново** — переносимо існуючі компоненти, хуки, бізнес-логіку
- **Адаптуємо** — змінюємо лише те, що потрібно для Next.js та нової архітектури
- `./temp` — read-only довідник, не частина нової збірки

### 2.2 Поточний стек (довідково)

| Технологія | Версія | Статус в новому проекті |
|-----------|--------|------------------------|
| React | 18.3.1 | ✅ Залишається |
| TypeScript | 5.8.3 | ✅ Залишається |
| Vite | 5.4.19 | ❌ Замінюється на Next.js |
| React Router v6 | 6.30.1 | ❌ Замінюється на App Router |
| TanStack React Query | 5.83.0 | ✅ Залишається (для client components) |
| Supabase JS | 2.91.1 | ✅ Залишається + додається @supabase/ssr |
| shadcn/ui + Radix | latest | ✅ Залишається |
| Tailwind CSS | 3.4.17 | ✅ Залишається (або оновлення до v4) |
| react-hook-form + zod | 7.61.1 / 3.25.76 | ✅ Залишається |
| TipTap | latest | ✅ Залишається |
| Recharts | 2.15.4 | ✅ Залишається |
| Vitest | 3.2.4 | ✅ Залишається |

### 2.3 Існуючі компоненти для переносу

**З `./temp/src/components/admin/` (→ Core):**
- AdminLayout, AdminSidebar — ~14 компонентів адмін-інтерфейсу
- ImageUpload, RichTextEditor, ProductPropertyValues, ProductModifications
- ProductPricesEditor, StockStatusSelect, SectionPropertiesManager

**З `./temp/src/components/ui/` (→ Core):**
- 22+ shadcn/ui компоненти (Button, Input, Dialog, Table, etc.)

**З `./temp/src/components/catalog/` (→ Core + Theme):**
- ProductCard, FilterSidebar, ProductGallery — theme-replaceable
- ProductCharacteristics, ModificationSelector, StockDisplay — core

**З `./temp/src/components/cart/`, `checkout/`, `reviews/` (→ Core):**
- Кошик, оформлення замовлення, система відгуків

**З `./temp/src/hooks/` (→ Core):**
- useAuth, useCart, usePriceType, useDiscountedPrice, useProductReviews, useStock
- useProductsWithStock, useBanners

**З `./temp/src/lib/` (→ Core):**
- ThemeRegistry, ThemeContext, HookRegistry, PluginLoader, PluginSlot
- discountEngine, priceUtils, shipping-логіка

**З `./temp/src/pages/admin/` (→ Core):**
- 40+ адмін-сторінок

**З `./temp/src/themes/` (→ окремі теми):**
- default/ — еталонна тема
- beauty/ — альтернативна тема

**З `./temp/supabase/migrations/` (→ Core):**
- Всі міграції БД

---

## 3. Цільова архітектура

### 3.1 Високорівнева схема

```
┌───────────────────────────────────────────────────────────────┐
│                    SIMPLYCMS PROJECT                          │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  app/ (Next.js App Router)                              │  │
│  │  ├── (storefront)/ ← SSR публічні сторінки              │  │
│  │  ├── (cms)/admin/  ← Адмін-панель (client-side)         │  │
│  │  ├── api/          ← API Routes                         │  │
│  │  └── layout.tsx    ← Root layout з провайдерами          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          │ imports                             │
│  ┌───────────────────────▼─────────────────────────────────┐  │
│  │  packages/simplycms/ (GIT SUBTREE → Core repo)          │  │
│  │  ├── core/        @simplycms/core                       │  │
│  │  ├── admin/       @simplycms/admin                      │  │
│  │  ├── ui/          @simplycms/ui                         │  │
│  │  ├── plugins/     @simplycms/plugins                    │  │
│  │  ├── themes/      @simplycms/themes                     │  │
│  │  └── schema/     Seed-міграції (референс)                  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                          │ imports                             │
│  ┌───────────────────────▼─────────────────────────────────┐  │
│  │  themes/           (Локальні теми проекту)               │  │
│  │  └── default/      Тема за замовчуванням                 │  │
│  └─────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  plugins/          (Локальні плагіни проекту)            │  │
│  │  └── example/      Плагін-приклад                        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                               │
│  simplycms.config.ts  ← Конфігурація CMS                     │
│  middleware.ts        ← Auth + routing middleware              │
│  next.config.ts       ← Next.js конфігурація                  │
└───────────────────────────────────────────────────────────────┘
```

### 3.2 Потік даних

```
Browser Request
    │
    ▼
middleware.ts (auth check, redirects)
    │
    ├── Public page → Server Component → Supabase (server client) → HTML response
    │                                                                    │
    │                                                          hydration ▼
    │                                                    Client Components
    │                                                    (cart, filters, forms)
    │
    ├── Admin page → Client Component → Supabase (browser client) → SPA behavior
    │
    └── API route → Server handler → Supabase (service role) → JSON response
```

---

## 4. Структура репозиторіїв

### 4.1 Два репозиторії

**Репозиторій А (основний, для розробки):**
- URL: `https://github.com/VSydorenko/simplyCMS`
- Призначення: повний проект (стартер + ядро як subtree + теми + плагіни)
- Хто використовує: власник проекту, розробники магазинів

**Репозиторій Б (ядро, буде створено пізніше):**
- URL: буде визначено (наприклад, `https://github.com/VSydorenko/simplycms-core`)
- Призначення: тільки ядро CMS (пакети з `packages/simplycms/`)
- Хто використовує: контриб'ютори ядра, інші проекти що використовують SimplyCMS

### 4.2 Зв'язок між репозиторіями

```
Репозиторій А (simplyCMS)               Репозиторій Б (core)
┌──────────────────────────┐            ┌──────────────────────┐
│ app/                     │            │ core/                │
│ packages/                │            │ admin/               │
│   └── simplycms/ ◄───────────────────►│ ui/                  │
│       ├── core/          │  subtree   │ plugins/             │
│       ├── admin/         │  sync      │ themes/              │
│       ├── ui/            │            │ db/                  │
│       └── ...            │            │ package.json         │
│ themes/                  │            └──────────────────────┘
│ plugins/                 │
│ temp/ (референс)         │
└──────────────────────────┘
```

### 4.3 Git Subtree — технічні деталі

**Subtree працює без GitHub-організації.** Це стандартна git-функціональність:

- Працює з будь-яким git-репозиторієм (GitHub, GitLab, Bitbucket, self-hosted)
- Не потрібна організація — звичайний персональний акаунт підходить
- Для всіх користувачів працює однаково:
  - `subtree pull` — будь-хто може підтягнути оновлення з публічного репо
  - `subtree push` — потрібен write-доступ до core-репо (або через fork → PR)
- Subtree-репо виглядає як звичайний git-репо і працює з усіма git-інструментами

---

## 5. Git Subtree workflow

### 5.1 Початкове підключення ядра

```bash
# Додаємо remote для зручності
git remote add simplycms-core https://github.com/VSydorenko/<core-repo-name>.git

# Додаємо ядро як subtree
git subtree add --prefix=packages/simplycms simplycms-core main --squash
```

### 5.2 Повсякденна розробка

Розробка відбувається в основному репозиторії (simplyCMS). Змінюються файли
де завгодно — і в `app/`, і в `packages/simplycms/`, і в `themes/`.

```bash
# Звичайний git workflow
git add .
git commit -m "feat: додано нову сторінку в адмінку"
git push origin main
```

### 5.3 Публікація змін ядра

Коли в `packages/simplycms/` накопичились зміни, які мають потрапити в core-репо:

```bash
# Відправити зміни з packages/simplycms/ в core-репо
npm run cms:push
# → git subtree push --prefix=packages/simplycms simplycms-core main
```

### 5.4 Оновлення ядра з core-репо

Коли в core-репо з'явились нові зміни (від інших контриб'юторів):

```bash
# Підтягнути оновлення ядра
npm run cms:pull
# → git subtree pull --prefix=packages/simplycms simplycms-core main --squash
```

### 5.5 Скрипти в package.json

```json
{
  "scripts": {
    "cms:pull": "git subtree pull --prefix=packages/simplycms simplycms-core main --squash",
    "cms:push": "git subtree push --prefix=packages/simplycms simplycms-core main",
    "cms:push:branch": "git subtree push --prefix=packages/simplycms simplycms-core",
    "cms:diff": "git diff HEAD -- packages/simplycms/"
  }
}
```

### 5.6 Workflow для стороннього користувача SimplyCMS

```bash
# 1. Клонувати стартер
git clone https://github.com/VSydorenko/simplyCMS my-store
cd my-store

# 2. Ядро вже в packages/simplycms/ (частина репо)
npm install
npm run dev

# 3. Оновити ядро пізніше
git remote add simplycms-core https://github.com/VSydorenko/<core-repo-name>.git
npm run cms:pull

# 4. Якщо хочеш контриб'ютити в ядро:
# Fork core-repo → push → PR
git remote add my-core-fork https://github.com/user/simplycms-core-fork.git
git subtree push --prefix=packages/simplycms my-core-fork feature/my-fix
# → створити PR з my-core-fork в оригінальний core-repo
```

---

## 6. Детальна структура проекту

### 6.1 Корінь проекту

```
simplyCMS/
├── app/                            # Next.js App Router (сторінки)
├── packages/
│   └── simplycms/                  # GIT SUBTREE → Core repo
├── themes/                         # Локальні теми проекту
├── plugins/                        # Локальні плагіни проекту
├── public/                         # Статичні файли
├── temp/                           # Референсний проект (поточний SPA)
│
├── simplycms.config.ts             # Конфігурація CMS
├── next.config.ts                  # Next.js конфігурація
├── middleware.ts                   # Auth middleware
├── tailwind.config.ts              # Tailwind конфігурація
├── tsconfig.json                   # TypeScript конфігурація
├── turbo.json                      # Turborepo конфігурація (якщо потрібен)
├── package.json                    # Workspace root + scripts
├── .env.local                      # Environment variables
└── .gitignore
```

### 6.2 Директорія app/ (Next.js App Router)

```
app/
├── layout.tsx                      # Root Layout
│                                   # - CMSProvider (конфігурація)
│                                   # - AuthProvider (Supabase SSR)
│                                   # - ThemeProvider (активна тема)
│                                   # - QueryClientProvider (TanStack)
│                                   # - Toaster
│
├── (storefront)/                   # ── SSR ПУБЛІЧНІ СТОРІНКИ ──
│   ├── layout.tsx                  # MainLayout з теми (header, footer)
│   ├── page.tsx                    # / — Головна сторінка (SSR)
│   │
│   ├── catalog/
│   │   ├── page.tsx                # /catalog — Каталог (SSR + ISR)
│   │   └── [sectionSlug]/
│   │       ├── page.tsx            # /catalog/:section (SSR + ISR)
│   │       └── [productSlug]/
│   │           └── page.tsx        # /catalog/:section/:product (SSR + ISR)
│   │                               # generateMetadata, Schema.org
│   │
│   ├── properties/
│   │   ├── page.tsx                # /properties (SSR)
│   │   └── [propertySlug]/
│   │       ├── page.tsx            # (SSR)
│   │       └── [optionSlug]/
│   │           └── page.tsx        # (SSR)
│   │
│   ├── cart/
│   │   └── page.tsx                # /cart ("use client")
│   │
│   ├── checkout/
│   │   └── page.tsx                # /checkout ("use client")
│   │
│   └── order-success/
│       └── [orderId]/
│           └── page.tsx            # /order-success/:id
│
├── auth/
│   ├── page.tsx                    # /auth — Login/Register ("use client")
│   └── callback/
│       └── route.ts                # /auth/callback — Supabase OAuth callback
│
├── (protected)/                    # ── ЗАХИЩЕНІ СТОРІНКИ ──
│   ├── layout.tsx                  # Перевірка авторизації (redirect якщо не залогінений)
│   └── profile/
│       ├── layout.tsx              # ProfileLayout з теми
│       ├── page.tsx                # /profile
│       ├── orders/
│       │   ├── page.tsx            # /profile/orders
│       │   └── [orderId]/
│       │       └── page.tsx        # /profile/orders/:id
│       └── settings/
│           └── page.tsx            # /profile/settings
│
├── (cms)/                          # ── АДМІН-ПАНЕЛЬ ──
│   └── admin/
│       ├── layout.tsx              # AdminLayout (sidebar + auth guard)
│       │                           # "use client" — вся адмінка client-side
│       ├── page.tsx                # /admin — Dashboard
│       ├── products/
│       │   ├── page.tsx            # /admin/products — Список товарів
│       │   ├── new/
│       │   │   └── page.tsx        # /admin/products/new — Створення
│       │   └── [productId]/
│       │       └── page.tsx        # /admin/products/:id — Редагування
│       ├── sections/
│       │   └── page.tsx            # /admin/sections
│       ├── orders/
│       │   ├── page.tsx            # /admin/orders
│       │   └── [orderId]/
│       │       └── page.tsx        # /admin/orders/:id
│       ├── users/
│       │   └── page.tsx            # /admin/users
│       ├── shipping/
│       │   └── page.tsx            # /admin/shipping
│       ├── discounts/
│       │   └── page.tsx            # /admin/discounts
│       ├── reviews/
│       │   └── page.tsx            # /admin/reviews
│       ├── banners/
│       │   └── page.tsx            # /admin/banners
│       ├── themes/
│       │   └── page.tsx            # /admin/themes
│       ├── plugins/
│       │   └── page.tsx            # /admin/plugins
│       └── settings/
│           └── page.tsx            # /admin/settings
│
├── api/                            # ── API ROUTES ──
│   ├── revalidate/
│   │   └── route.ts               # POST /api/revalidate — On-demand ISR
│   └── guest-order/
│       └── route.ts                # GET /api/guest-order — Guest order access
│
├── not-found.tsx                   # 404 сторінка
├── error.tsx                       # Error boundary
├── loading.tsx                     # Global loading UI
└── globals.css                     # Tailwind + CSS змінні дизайн-системи
```

### 6.3 Директорія packages/simplycms/ (Ядро — Git Subtree)

```
packages/simplycms/
├── core/                           # @simplycms/core
│   ├── src/
│   │   ├── supabase/
│   │   │   ├── server.ts           # createServerClient (cookie-based)
│   │   │   ├── client.ts           # createBrowserClient
│   │   │   ├── middleware.ts       # updateSession helper для middleware
│   │   │   └── types.ts           # Database types (generated)
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.tsx         # AuthContext + AuthProvider
│   │   │   ├── useCart.tsx         # CartContext + CartProvider
│   │   │   ├── usePriceType.ts    # Визначення типу ціни
│   │   │   ├── useDiscountedPrice.ts
│   │   │   ├── useProductReviews.ts
│   │   │   ├── useStock.ts
│   │   │   ├── useProductsWithStock.ts
│   │   │   └── useBanners.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── discountEngine.ts   # Розрахунок знижок
│   │   │   ├── priceUtils.ts       # Утиліти для цін
│   │   │   ├── shipping/           # Розрахунок доставки
│   │   │   └── utils.ts            # cn(), formatPrice(), etc.
│   │   │
│   │   ├── types/
│   │   │   ├── product.ts          # Product, Modification, Price types
│   │   │   ├── order.ts            # Order, OrderItem types
│   │   │   ├── user.ts             # User, Profile, UserRole types
│   │   │   └── index.ts            # Re-export all types
│   │   │
│   │   ├── providers/
│   │   │   ├── CMSProvider.tsx     # Root CMS provider (config, query client)
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts                # Public API exports
│   │
│   ├── package.json                # { "name": "@simplycms/core" }
│   └── tsconfig.json
│
├── admin/                          # @simplycms/admin
│   ├── src/
│   │   ├── layouts/
│   │   │   ├── AdminLayout.tsx     # Адмін-оболонка (sidebar, header)
│   │   │   └── AdminSidebar.tsx    # Навігація + PluginSlot
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Products.tsx        # Список товарів
│   │   │   ├── ProductEdit.tsx     # Редагування товару
│   │   │   ├── Sections.tsx        # Категорії
│   │   │   ├── Orders.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── UserEdit.tsx
│   │   │   ├── Shipping.tsx
│   │   │   ├── ShippingMethods.tsx
│   │   │   ├── Discounts.tsx
│   │   │   ├── Reviews.tsx
│   │   │   ├── Banners.tsx
│   │   │   ├── Themes.tsx          # Управління темами
│   │   │   ├── Plugins.tsx         # Управління плагінами
│   │   │   ├── Settings.tsx
│   │   │   └── ... (інші адмін-сторінки)
│   │   │
│   │   ├── components/
│   │   │   ├── ImageUpload.tsx
│   │   │   ├── RichTextEditor.tsx
│   │   │   ├── ProductPropertyValues.tsx
│   │   │   ├── ProductModifications.tsx
│   │   │   ├── ProductPricesEditor.tsx
│   │   │   ├── StockStatusSelect.tsx
│   │   │   ├── SectionPropertiesManager.tsx
│   │   │   └── ... (інші адмін-компоненти)
│   │   │
│   │   └── index.ts                # Public API: AdminLayout, admin pages
│   │
│   ├── package.json                # { "name": "@simplycms/admin" }
│   └── tsconfig.json
│
├── ui/                             # @simplycms/ui
│   ├── src/
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── select.tsx
│   │   ├── ... (22+ shadcn/ui компоненти)
│   │   └── index.ts
│   │
│   ├── package.json                # { "name": "@simplycms/ui" }
│   └── tsconfig.json
│
├── plugin-system/                  # @simplycms/plugins
│   ├── src/
│   │   ├── HookRegistry.ts        # Реєстрація та виконання хуків
│   │   ├── PluginLoader.ts         # Завантаження плагінів
│   │   ├── PluginSlot.tsx          # React-компонент для рендерингу хуків
│   │   ├── types.ts                # PluginModule, HookHandler, etc.
│   │   ├── hooks.ts                # Список доступних хуків (25+)
│   │   └── index.ts
│   │
│   ├── package.json                # { "name": "@simplycms/plugins" }
│   └── tsconfig.json
│
├── theme-system/                   # @simplycms/themes
│   ├── src/
│   │   ├── ThemeRegistry.ts        # Реєстрація тем
│   │   ├── ThemeContext.tsx         # React context для активної теми
│   │   ├── ThemeResolver.ts        # Резолвація теми по імені (local → npm)
│   │   ├── types.ts                # ThemeModule, ThemeManifest, ThemePages
│   │   └── index.ts
│   │
│   ├── package.json                # { "name": "@simplycms/themes" }
│   └── tsconfig.json
│
├── supabase/                       # БД проекту (міграції, типи, Edge Functions)
│   ├── migrations/
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_products.sql
│   │   ├── 003_orders.sql
│   │   ├── 004_themes_plugins.sql
│   │   ├── 005_shipping.sql
│   │   ├── 006_discounts.sql
│   │   ├── 007_reviews.sql
│   │   └── ... (всі міграції з temp/supabase/migrations/)
│   │
│   ├── seed.sql                    # Початкові дані (order_statuses, price_types, etc.)
│   ├── functions/                  # Supabase Edge Functions
│   │   └── get-guest-order/
│   │       └── index.ts
│   │
│   ├── package.json                # (site-level, не входить в subtree)
│   └── tsconfig.json
│
├── package.json                    # Workspace root для packages/simplycms/*
├── turbo.json                      # Build pipeline для subtree
└── README.md                       # Документація ядра
```

### 6.4 Директорія themes/

```
themes/
├── default/                        # Тема за замовчуванням (еталонна)
│   ├── package.json                # { "name": "simplycms-theme-default" }
│   ├── manifest.ts                 # ThemeManifest (name, version, supports, settings)
│   ├── index.ts                    # Головний експорт: ThemeModule
│   │
│   ├── layouts/
│   │   ├── MainLayout.tsx          # Header + Footer + children
│   │   ├── CatalogLayout.tsx       # Каталог з sidebar
│   │   └── ProfileLayout.tsx       # Профіль з sidebar
│   │
│   ├── pages/
│   │   ├── HomePage.tsx            # Головна сторінка
│   │   ├── CatalogPage.tsx         # Список товарів
│   │   ├── CatalogSectionPage.tsx  # Категорія товарів
│   │   ├── ProductPage.tsx         # Картка товару
│   │   ├── CartPage.tsx            # Кошик
│   │   ├── CheckoutPage.tsx        # Оформлення
│   │   ├── ProfilePage.tsx         # Профіль
│   │   ├── OrdersPage.tsx          # Замовлення
│   │   ├── AuthPage.tsx            # Авторизація
│   │   └── NotFoundPage.tsx        # 404
│   │
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx         # Кастомна картка товару
│   │   ├── FilterSidebar.tsx       # Кастомна бічна панель фільтрів
│   │   ├── ProductGallery.tsx      # Галерея зображень
│   │   ├── HeroBanner.tsx
│   │   └── ... (theme-specific компоненти)
│   │
│   └── styles/
│       └── theme.css               # Theme-specific CSS (CSS variables override)
│
└── README.md                       # Гайд по створенню тем
```

### 6.5 Директорія plugins/

```
plugins/
├── example/                        # Плагін-приклад
│   ├── package.json                # { "name": "simplycms-plugin-example" }
│   ├── manifest.ts                 # PluginManifest
│   ├── index.ts                    # register(hookRegistry) + unregister()
│   ├── components/                 # UI компоненти плагіна
│   └── migrations/                 # Додаткові міграції (якщо плагін потребує таблиць)
│
└── README.md                       # Гайд по створенню плагінів
```

---

## 7. Система тем

### 7.1 Контракт теми (ThemeModule)

Кожна тема повинна експортувати об'єкт що відповідає інтерфейсу `ThemeModule`:

```typescript
// Визначено в @simplycms/themes
interface ThemeModule {
  manifest: ThemeManifest;

  // Обов'язкові layouts
  MainLayout: React.ComponentType<{ children: React.ReactNode }>;
  CatalogLayout: React.ComponentType<{ children: React.ReactNode }>;
  ProfileLayout: React.ComponentType<{ children: React.ReactNode }>;

  // Обов'язкові сторінки
  pages: ThemePages;

  // Опціональні компоненти (override defaults)
  components?: ThemeComponents;
}

interface ThemePages {
  HomePage: React.ComponentType;
  CatalogPage: React.ComponentType;
  CatalogSectionPage: React.ComponentType;
  ProductPage: React.ComponentType<{ product: Product }>;
  CartPage: React.ComponentType;
  CheckoutPage: React.ComponentType;
  ProfilePage: React.ComponentType;
  OrdersPage: React.ComponentType;
  OrderDetailPage: React.ComponentType;
  SettingsPage: React.ComponentType;
  AuthPage: React.ComponentType;
  NotFoundPage: React.ComponentType;
  // Properties pages
  PropertiesPage?: React.ComponentType;
  PropertyDetailPage?: React.ComponentType;
  PropertyOptionPage?: React.ComponentType;
}

interface ThemeManifest {
  name: string;
  displayName: string;
  version: string;
  description?: string;
  author?: string;
  thumbnail?: string;
  supports?: {
    darkMode?: boolean;
    customColors?: boolean;
  };
  settings?: ThemeSettingDefinition[];
}
```

### 7.2 Як тема підключається до app/

Сторінки в `app/(storefront)/` використовують компоненти теми:

```typescript
// app/(storefront)/page.tsx (Головна сторінка)
import { getActiveTheme } from '@simplycms/themes';

export default async function HomePage() {
  const theme = await getActiveTheme();
  const { HomePage: ThemedHomePage } = theme.pages;

  // SSR: серверний рендеринг сторінки з теми
  return <ThemedHomePage />;
}

export async function generateMetadata() {
  // SEO метадані з БД
  return { title: 'SimplyCMS Store', description: '...' };
}
```

```typescript
// app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx
import { getActiveTheme } from '@simplycms/themes';
import { createServerSupabase } from '@simplycms/core/supabase/server';

export default async function ProductPage({ params }) {
  const { sectionSlug, productSlug } = await params;
  const supabase = await createServerSupabase();
  const theme = await getActiveTheme();

  // SSR: завантаження даних на сервері
  const { data: product } = await supabase
    .from('products')
    .select('*, sections(*), product_modifications(*), product_prices(*)')
    .eq('slug', productSlug)
    .eq('is_active', true)
    .single();

  const { ProductPage: ThemedProductPage } = theme.pages;
  return <ThemedProductPage product={product} />;
}

export async function generateMetadata({ params }) {
  // Dynamic SEO metadata
  const product = await fetchProduct(params.productSlug);
  return {
    title: product.name,
    description: product.description,
    openGraph: { images: product.images },
  };
}
```

### 7.3 Резолвація тем

Порядок пошуку теми по імені:

```
1. themes/<name>/           → Локальна тема в проекті
2. node_modules/<name>/     → npm-пакет (повне ім'я)
3. node_modules/simplycms-theme-<name>/  → npm-пакет (скорочене ім'я)
```

### 7.4 Підключення теми до SSR

**Ключова проблема:** теми мають рендеритись на сервері, тому не можуть завантажуватись динамічно через lazy import як в поточному SPA.

**Рішення:** статичний імпорт в `simplycms.config.ts`:

```typescript
// simplycms.config.ts
import defaultTheme from './themes/default';

export default defineConfig({
  theme: defaultTheme,              // Передаємо модуль теми напряму
  // АБО для npm-пакетів:
  // theme: '@someone/simplycms-theme-elegant',  // Строка → резолвиться при build
});
```

При зміні активної теми через адмінку потрібен **rebuild** (обмеження Next.js).
Для self-hosted: автоматичний rebuild.
Для Vercel/інших: тригер через deploy hook.

---

## 8. Система плагінів

### 8.1 Контракт плагіна (PluginModule)

```typescript
// Визначено в @simplycms/plugins
interface PluginModule {
  manifest: PluginManifest;
  register: (registry: HookRegistryInterface) => void;
  unregister?: (registry: HookRegistryInterface) => void;
}

interface PluginManifest {
  name: string;
  displayName: string;
  version: string;
  description?: string;
  author?: string;
  hooks?: string[];            // Список хуків, які використовує плагін
  settings?: PluginSettingDefinition[];
  migrations?: string[];       // SQL файли для додаткових таблиць
}
```

### 8.2 Доступні хуки (Hook Points)

```typescript
// Визначено в @simplycms/plugins/hooks.ts

// ── Admin hooks ──
'admin.sidebar.items'               // Додати пункти в sidebar
'admin.dashboard.stats'             // Додати статистику на dashboard
'admin.dashboard.widgets'           // Додати віджети на dashboard
'admin.product.form.before'         // Перед формою товару
'admin.product.form.fields'         // Додаткові поля в формі товару
'admin.product.form.after'          // Після форми товару
'admin.product.form.sidebar'        // Sidebar форми товару
'admin.order.detail.actions'        // Дії на сторінці замовлення
'admin.shipping.method.settings'    // Налаштування методу доставки
'admin.discount.form.fields'        // Поля форми знижки

// ── Storefront hooks ──
'product.detail.before'             // Перед деталями товару
'product.detail.after'              // Після деталей товару
'product.card.badges'               // Бейджі на картці товару

// ── Checkout hooks ──
'checkout.steps'                    // Кроки оформлення
'checkout.shipping.methods'         // Методи доставки
'checkout.shipping.rates'           // Розрахунок вартості доставки
'checkout.shipping.validate'        // Валідація доставки
'checkout.payment.methods'          // Методи оплати (майбутнє)

// ── Order lifecycle hooks ──
'order.created'                     // Після створення замовлення
'order.status_changed'              // При зміні статусу
'order.shipping.process'            // Обробка доставки
```

### 8.3 Приклад плагіна

```typescript
// plugins/seo-optimizer/index.ts
import type { PluginModule } from '@simplycms/plugins';

const SEOPlugin: PluginModule = {
  manifest: {
    name: 'seo-optimizer',
    displayName: 'SEO Optimizer',
    version: '1.0.0',
    hooks: ['product.detail.after', 'admin.product.form.fields'],
  },

  register(registry) {
    // Додаємо SEO-поля в форму товару в адмінці
    registry.register('admin.product.form.fields', 'seo-optimizer', {
      handler: (context) => ({
        component: SEOFieldsComponent,
        props: { productId: context.productId },
      }),
      priority: 100,
    });

    // Додаємо structured data на сторінку товару
    registry.register('product.detail.after', 'seo-optimizer', {
      handler: (context) => ({
        component: ProductStructuredData,
        props: { product: context.product },
      }),
    });
  },
};

export default SEOPlugin;
```

### 8.4 Підключення плагінів

```typescript
// simplycms.config.ts
import seoPlugin from './plugins/seo-optimizer';
import examplePlugin from './plugins/example';

export default defineConfig({
  theme: defaultTheme,
  plugins: [
    seoPlugin,
    examplePlugin,
    // Можна також вказати npm-пакети:
    // '@someone/simplycms-plugin-analytics',
  ],
});
```

---

## 9. SSR-стратегія для публічних сторінок

### 9.1 Рендеринг-стратегії по маршрутах

| Маршрут | Стратегія | Revalidate | Обґрунтування |
|---------|-----------|------------|---------------|
| `/` | SSR | 3600s (1 год) | Банери та featured-контент змінюються рідко |
| `/catalog` | SSR | 1800s (30 хв) | Список товарів, фільтри інтерактивні (client) |
| `/catalog/:section` | SSR + ISR | 1800s | Категорії стабільні, товари оновлюються помірно |
| `/catalog/:section/:product` | SSR + ISR | 3600s | Найважливіша для SEO, контент стабільний |
| `/properties` | SSR | 86400s (24 год) | Довідковий контент, рідко змінюється |
| `/cart` | Client-only | — | Повністю залежить від клієнтського стану |
| `/checkout` | Client-only | — | Форми, валідація, оплата |
| `/auth` | Client-only | — | Форми авторизації |
| `/profile/*` | Client-only | — | Особисті дані, потрібна авторизація |
| `/admin/*` | Client-only | — | Адмін-панель, SPA behavior |

### 9.2 On-demand ISR Revalidation

При зміні даних через адмінку — тригерити revalidation:

```typescript
// Виклик з адмінки при збереженні товару:
await fetch('/api/revalidate', {
  method: 'POST',
  body: JSON.stringify({
    type: 'product',
    slug: productSlug,
    sectionSlug: sectionSlug,
  }),
});

// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const { type, slug, sectionSlug } = await request.json();

  if (type === 'product') {
    revalidatePath(`/catalog/${sectionSlug}/${slug}`);
    revalidatePath(`/catalog/${sectionSlug}`);
    revalidatePath('/catalog');
  }

  return Response.json({ revalidated: true });
}
```

### 9.3 Server Components vs Client Components

**Server Components** (default в App Router):
- Layouts (MainLayout, CatalogLayout)
- Сторінки каталогу (data fetching)
- Product page (SEO content)
- Properties pages
- Metadata generation

**Client Components** (`"use client"`):
- Кошик (useCart, localStorage sync)
- Фільтри каталогу (інтерактивні)
- Форми (react-hook-form)
- Карусель зображень (Embla)
- Rich-text редактор (TipTap)
- Тост-повідомлення (Sonner)
- Графіки (Recharts)
- Вся адмін-панель

---

## 10. Автентифікація та авторизація

### 10.1 Архітектура (Supabase SSR)

**Пакет:** `@supabase/ssr` — cookie-based session management.

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Browser                Server                       │
│  ┌──────┐              ┌──────────────────────┐      │
│  │Cookie│◄────────────►│ middleware.ts         │      │
│  │(auth)│              │ - updateSession()    │      │
│  └──────┘              │ - auth guard         │      │
│                        │ - admin guard        │      │
│                        └──────────┬───────────┘      │
│                                   │                  │
│                        ┌──────────▼───────────┐      │
│                        │ Server Components    │      │
│                        │ - createServerClient │      │
│                        │ - getUser()          │      │
│                        └──────────┬───────────┘      │
│                                   │                  │
│                        ┌──────────▼───────────┐      │
│                        │ Supabase (PostgreSQL) │      │
│                        └──────────────────────┘      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 10.2 Middleware

```typescript
// middleware.ts
import { createMiddlewareClient } from '@simplycms/core/supabase/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Захист адмін-панелі
  if (pathname.startsWith('/admin')) {
    if (!user) return NextResponse.redirect(new URL('/auth', request.url));

    const { data: role } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!role) return NextResponse.redirect(new URL('/', request.url));
  }

  // Захист профілю
  if (pathname.startsWith('/profile')) {
    if (!user) return NextResponse.redirect(new URL('/auth', request.url));
  }

  // Redirect залогінених з /auth
  if (pathname === '/auth' && user) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/auth'],
};
```

### 10.3 Міграція з localStorage JWT

| Поточний стан | Новий стан |
|--------------|------------|
| `supabase.auth.onAuthStateChange()` | Cookie-based через `@supabase/ssr` |
| JWT в localStorage | HTTP-only cookies |
| Client-side admin check (setTimeout) | Server-side middleware check |
| `useAuth()` hook з client state | `useAuth()` hook + server helper |

---

## 11. База даних та міграції

### 11.1 Supabase залишається як backend

- PostgreSQL з RLS (Row Level Security)
- Supabase Auth для автентифікації
- Supabase Storage для файлів
- Supabase Edge Functions для серверної логіки

### 11.2 Міграції ядра vs міграції проекту

```
packages/simplycms/schema/seed-migrations/ ← Seed-міграції ядра (референс SQL для bootstrap)
  001_initial_schema.sql
  002_products.sql
  ...

supabase/migrations/                   ← Актуальні міграції проекту (поза subtree)
  100_custom_tables.sql                 ← Кастомні таблиці проекту
```

Нумерація: ядро використовує 001-099, проект 100+.

### 11.3 Поточна схема (для переносу з temp/)

Таблиці що переносяться як є:
- `products`, `product_modifications`, `product_prices`, `product_property_values`
- `sections`, `section_properties`, `property_options`
- `orders`, `order_items`, `order_statuses`, `order_addresses`
- `profiles`, `user_roles`, `user_categories`
- `shipping_methods`, `shipping_zones`, `pickup_points`, `stock_by_pickup_point`
- `discounts`, `discount_groups`
- `price_types`
- `themes`, `plugins`, `plugin_events`
- `banners`
- `product_reviews`

---

## 12. План міграції з поточного проекту

### 12.1 Референс

Поточний проект (`./temp/`) — це повноцінно працюючий SPA. Міграція відбувається **переносом та адаптацією**, а не переписуванням з нуля.

### 12.2 Фази міграції

#### Фаза 0: Підготовка середовища
- [ ] Перемістити поточний код в `./temp/`
- [ ] Ініціалізувати Next.js проект в корені
- [ ] Налаштувати workspace (pnpm/npm workspaces)
- [ ] Налаштувати TypeScript path aliases
- [ ] Налаштувати Tailwind CSS
- [ ] Перенести `globals.css` / дизайн-систему з `temp/src/index.css`
- [ ] Налаштувати `.env.local` з Supabase credentials

#### Фаза 1: Ядро (packages/simplycms/)
- [ ] Створити структуру пакетів (core, admin, ui, plugins, themes, db)
- [ ] **@simplycms/ui:** Перенести shadcn/ui компоненти з `temp/src/components/ui/`
- [ ] **@simplycms/core:** Перенести Supabase клієнт, створити server/client/middleware варіанти
- [ ] **@simplycms/core:** Перенести хуки (useAuth → cookie-based, useCart, usePriceType, etc.)
- [ ] **@simplycms/core:** Перенести бізнес-логіку (discountEngine, priceUtils, shipping)
- [ ] **@simplycms/core:** Перенести TypeScript типи
- [ ] **@simplycms/core:** Створити CMSProvider
- [ ] **@simplycms/plugins:** Перенести HookRegistry, PluginLoader, PluginSlot
- [ ] **@simplycms/themes:** Перенести ThemeRegistry, ThemeContext, types
- [ ] **supabase/:** Перенести та впорядкувати міграції з `temp/supabase/migrations/`
- [ ] **supabase/:** Перенести Edge Functions

#### Фаза 2: Публічні SSR-сторінки
- [ ] Створити `app/layout.tsx` з провайдерами
- [ ] Створити `middleware.ts`
- [ ] Створити `app/(storefront)/layout.tsx` (MainLayout з теми)
- [ ] **Головна сторінка:** `app/(storefront)/page.tsx` — SSR з банерами, featured товарами
- [ ] **Каталог:** `app/(storefront)/catalog/page.tsx` — SSR + клієнтські фільтри
- [ ] **Категорія:** `app/(storefront)/catalog/[sectionSlug]/page.tsx` — SSR + ISR
- [ ] **Товар:** `app/(storefront)/catalog/[sectionSlug]/[productSlug]/page.tsx` — SSR + ISR + generateMetadata
- [ ] **Властивості:** `app/(storefront)/properties/...` — SSR
- [ ] Налаштувати `generateMetadata` для SEO
- [ ] Налаштувати ISR revalidation
- [ ] Створити `app/api/revalidate/route.ts`
- [ ] Створити `app/not-found.tsx`, `app/error.tsx`

#### Фаза 3: Клієнтські сторінки
- [ ] **Кошик:** `app/(storefront)/cart/page.tsx` — client component
- [ ] **Checkout:** `app/(storefront)/checkout/page.tsx` — client component
- [ ] **Auth:** `app/auth/page.tsx` — client component + Supabase auth callback
- [ ] **Order Success:** `app/(storefront)/order-success/[orderId]/page.tsx`

#### Фаза 4: Профіль користувача
- [ ] Створити `app/(protected)/layout.tsx` з auth guard
- [ ] **Профіль:** `app/(protected)/profile/page.tsx`
- [ ] **Замовлення:** `app/(protected)/profile/orders/page.tsx`
- [ ] **Деталі замовлення:** `app/(protected)/profile/orders/[orderId]/page.tsx`
- [ ] **Налаштування:** `app/(protected)/profile/settings/page.tsx`

#### Фаза 5: Адмін-панель
- [ ] **@simplycms/admin:** Перенести AdminLayout, AdminSidebar
- [ ] **@simplycms/admin:** Перенести адмін-компоненти (ImageUpload, RichTextEditor, etc.)
- [ ] Створити `app/(cms)/admin/layout.tsx`
- [ ] Перенести сторінки по одній з `temp/src/pages/admin/`:
  - [ ] Dashboard
  - [ ] Products (list + edit + new)
  - [ ] Sections
  - [ ] Orders (list + detail)
  - [ ] Users
  - [ ] Shipping (methods + zones + pickup points)
  - [ ] Discounts
  - [ ] Reviews
  - [ ] Banners
  - [ ] Themes management
  - [ ] Plugins management
  - [ ] Settings
  - [ ] Price Types
  - [ ] User Categories
  - [ ] Order Statuses

#### Фаза 6: Тема за замовчуванням
- [ ] Створити `themes/default/` з переносом з `temp/src/themes/default/`
- [ ] Адаптувати layouts для Server Components
- [ ] Адаптувати pages для SSR data fetching
- [ ] Створити `themes/default/manifest.ts`
- [ ] (Опціонально) Перенести beauty theme

#### Фаза 7: Оптимізація та полірування
- [ ] Замінити `<img>` на `next/image` для оптимізації зображень
- [ ] Додати Schema.org structured data для товарів
- [ ] Додати OpenGraph зображення
- [ ] Налаштувати `robots.txt` та `sitemap.xml` (через `app/sitemap.ts`)
- [ ] Performance audit (Core Web Vitals)
- [ ] Перевірити Lighthouse scores
- [ ] Написати/адаптувати тести

#### Фаза 8: Git Subtree та дистрибуція
- [ ] Створити core-репозиторій
- [ ] Виконати початковий `git subtree push`
- [ ] Налаштувати npm scripts для subtree операцій
- [ ] Написати документацію для стороннього використання
- [ ] Створити `create-simplycms` CLI (або template з README)

---

## 13. Marketplace (майбутній розвиток)

### 13.1 Етапи розвитку екосистеми

| Етап | Опис | Пріоритет |
|------|------|-----------|
| **0. Локальні теми/плагіни** | Папки `themes/`, `plugins/` в проекті | Фаза 6-7 |
| **1. npm-пакети** | Підтримка npm-тем/плагінів в конфігурації | Після стабілізації |
| **2. CLI інсталятор** | `npx simplycms install theme <name>` | Після npm |
| **3. GitHub Registry** | `registry.json` як каталог тем/плагінів | Після CLI |
| **4. UI Marketplace** | Сторінка в адмінці для перегляду та встановлення | Після registry |
| **5. Auto-rebuild** | GitHub Actions для автоматичного rebuild при встановленні | Продвинутий |

### 13.2 Обмеження Next.js

Встановлення теми/плагіна **потребує rebuild** (на відміну від WordPress):
- Нові компоненти повинні пройти через збірку Next.js
- Server Components компілюються під час `next build`
- Це обмеження платформи, не архітектури SimplyCMS

Для self-hosted: rebuild автоматичний (через CLI).
Для Vercel/cloud: тригер через deploy hook.

---

## 14. Технічні вимоги

### 14.1 Новий стек

| Технологія | Версія | Призначення |
|-----------|--------|-------------|
| **Next.js** | 15.x (App Router) | Фреймворк, SSR, routing |
| **React** | 19.x (або 18.3.x) | UI library |
| **TypeScript** | 5.x | Типізація |
| **@supabase/ssr** | latest | Cookie-based auth для SSR |
| **@supabase/supabase-js** | 2.x | Database client |
| **TanStack React Query** | 5.x | Client-side data fetching |
| **Tailwind CSS** | 3.x або 4.x | Стилі |
| **shadcn/ui** | latest | UI компоненти |
| **react-hook-form + zod** | latest | Форми + валідація |
| **pnpm** (рекомендовано) | latest | Package manager (workspace support) |

### 14.2 Workspace конфігурація

```json
// package.json (root)
{
  "name": "simplycms",
  "private": true,
  "workspaces": [
    "packages/simplycms/*",
    "themes/*",
    "plugins/*"
  ],
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "pnpm exec eslint .",
    "test": "vitest run",
    "cms:pull": "git subtree pull --prefix=packages/simplycms simplycms-core main --squash",
    "cms:push": "git subtree push --prefix=packages/simplycms simplycms-core main",
    "cms:diff": "git diff HEAD -- packages/simplycms/",
    "db:migrate": "supabase migration up",
    "db:generate-types": "supabase gen types typescript --local > packages/simplycms/core/src/supabase/types.ts"
  }
}
```

### 14.3 TypeScript Path Aliases

```json
// tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@simplycms/core/*": ["./packages/simplycms/core/src/*"],
      "@simplycms/admin/*": ["./packages/simplycms/admin/src/*"],
      "@simplycms/ui/*": ["./packages/simplycms/ui/src/*"],
      "@simplycms/plugins/*": ["./packages/simplycms/plugin-system/src/*"],
      "@simplycms/themes/*": ["./packages/simplycms/theme-system/src/*"],
      "@simplycms/db-types": ["./supabase/types.ts"],
      "@/*": ["./app/*"],
      "@themes/*": ["./themes/*"],
      "@plugins/*": ["./plugins/*"]
    }
  }
}
```

### 14.4 simplycms.config.ts

```typescript
import { defineConfig } from '@simplycms/core';
import defaultTheme from './themes/default';

export default defineConfig({
  // Активна тема
  theme: defaultTheme,

  // Активні плагіни
  plugins: [],

  // Supabase (беруться з .env.local якщо не вказано)
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },

  // SEO defaults
  seo: {
    siteName: 'My Store',
    defaultTitle: 'My Store — Best Products',
    titleTemplate: '%s | My Store',
  },

  // Localization (майбутнє)
  locale: 'uk-UA',
  currency: 'UAH',
});
```

---

## 15. Ризики та обмеження

### 15.1 Технічні ризики

| Ризик | Ймовірність | Вплив | Мітігація |
|-------|------------|-------|-----------|
| Hydration mismatch (cart, theme) | Висока | Середній | Використовувати `useEffect` для client-only стану, `suppressHydrationWarning` |
| Складність SSR + динамічні теми | Середня | Високий | Статичний імпорт теми, rebuild при зміні |
| Конфлікти при subtree merge | Середня | Середній | Чіткі межі ядра, --squash, npm scripts |
| Performance regression при SSR | Низька | Середній | ISR caching, streaming, моніторинг |
| Supabase RLS з server-side | Середня | Середній | Правильне передавання auth cookies на сервер |

### 15.2 Архітектурні обмеження

1. **Зміна теми потребує rebuild** — обмеження Next.js, не можна обійти
2. **Плагіни не можуть додавати нові маршрути runtime** — потрібен rebuild
3. **Admin-панель залишається client-side** — SSR для адмінки надмірний
4. **Git Subtree має learning curve** — потрібна документація для контриб'юторів

### 15.3 Scope обмеження

Наступне **НЕ входить** в скоп міграції:
- Інтернаціоналізація (i18n) — додається пізніше
- Мультитенантність — один проект = один магазин
- Payment processing — немає в поточному проекті
- Email сервіс — використовується Supabase email
- Мобільний додаток — тільки responsive web

---

## Додаток A: Мапа переносу файлів

```
temp/src/components/admin/*         → packages/simplycms/admin/src/components/*
temp/src/components/ui/*            → packages/simplycms/ui/src/*
temp/src/components/catalog/*       → packages/simplycms/core/src/components/catalog/*
                                      + themes/default/components/* (theme-specific)
temp/src/components/cart/*          → packages/simplycms/core/src/components/cart/*
temp/src/components/checkout/*      → packages/simplycms/core/src/components/checkout/*
temp/src/components/reviews/*       → packages/simplycms/core/src/components/reviews/*
temp/src/components/profile/*       → packages/simplycms/core/src/components/profile/*
temp/src/components/plugins/*       → packages/simplycms/plugin-system/src/*

temp/src/hooks/useAuth.tsx          → packages/simplycms/core/src/hooks/useAuth.tsx (адаптація)
temp/src/hooks/useCart.tsx          → packages/simplycms/core/src/hooks/useCart.tsx
temp/src/hooks/use*.ts              → packages/simplycms/core/src/hooks/*

temp/src/lib/themes/*               → packages/simplycms/theme-system/src/*
temp/src/lib/plugins/*              → packages/simplycms/plugin-system/src/*
temp/src/lib/discountEngine.ts      → packages/simplycms/core/src/lib/discountEngine.ts
temp/src/lib/priceUtils.ts          → packages/simplycms/core/src/lib/priceUtils.ts
temp/src/lib/shipping/*             → packages/simplycms/core/src/lib/shipping/*

temp/src/pages/admin/*              → packages/simplycms/admin/src/pages/*
temp/src/pages/Index.tsx            → themes/default/pages/HomePage.tsx
temp/src/pages/Catalog.tsx          → themes/default/pages/CatalogPage.tsx
temp/src/pages/ProductDetail.tsx    → themes/default/pages/ProductPage.tsx
temp/src/pages/Cart.tsx             → themes/default/pages/CartPage.tsx
temp/src/pages/Checkout.tsx         → themes/default/pages/CheckoutPage.tsx
temp/src/pages/Auth.tsx             → themes/default/pages/AuthPage.tsx
temp/src/pages/Profile*.tsx         → themes/default/pages/Profile*.tsx

temp/src/themes/default/*           → themes/default/* (адаптація)
temp/src/themes/beauty/*            → themes/beauty/* (опціонально)

temp/src/integrations/supabase/*    → packages/simplycms/core/src/supabase/*
temp/src/index.css                  → app/globals.css

temp/supabase/migrations/*          → supabase/migrations/* (рівень проекту)
temp/supabase/functions/*           → supabase/functions/* (рівень проекту)
```

---

## Додаток B: Контрольний список готовності

- [ ] Next.js проект ініціалізовано і запускається
- [ ] Workspace з пакетами працює (імпорти між пакетами)
- [ ] Supabase SSR працює (cookie-based auth)
- [ ] Middleware захищає /admin і /profile
- [ ] Головна сторінка рендериться на сервері (SSR)
- [ ] Каталог рендериться на сервері (SSR + ISR)
- [ ] Картка товару рендериться на сервері з metadata
- [ ] Кошик працює (client-side + localStorage)
- [ ] Checkout працює
- [ ] Авторизація працює (login/register/logout)
- [ ] Профіль користувача працює
- [ ] Адмін-панель працює (всі 40+ сторінок)
- [ ] Система тем працює (default theme)
- [ ] Система плагінів працює (hook registry)
- [ ] Git Subtree налаштовано і працює
- [ ] Тести проходять
- [ ] Lighthouse Performance > 90
- [ ] Lighthouse SEO > 95
