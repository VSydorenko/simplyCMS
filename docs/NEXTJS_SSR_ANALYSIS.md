# SimplyCMS: Аналіз проекту та план міграції на Next.js (SSR-first)

## 1. Що це за проект?

**SimplyCMS** (SolarStore) — це повнофункціональна e-commerce CMS-платформа, спеціалізована на продажі товарів альтернативної енергетики (сонячні панелі, акумулятори, інвертори, послуги монтажу).

Платформа має **дуальну архітектуру**:
- **Публічний магазин** — каталог, картка товару, кошик, оформлення замовлення
- **Адмін-панель** — управління товарами, замовленнями, користувачами, знижками, доставкою, темами, плагінами (40+ сторінок)

### Ключові бізнес-фічі:
- Мультицінова система (різні ціни для різних категорій користувачів)
- Модифікації товарів (варіанти: колір, потужність тощо)
- Система знижок (правила, групи, умови)
- Складський облік по точках видачі
- Система відгуків з модерацією
- Тематизація (змінні теми оформлення магазину)
- Плагінна архітектура (50+ хук-точок розширення)
- Гостьові замовлення (без реєстрації)

---

## 2. Технологічний стек

| Шар | Технологія | Версія |
|-----|-----------|--------|
| **Фреймворк** | React + TypeScript | 18.3.1 / 5.8.3 |
| **Збірка** | Vite (SWC) | 5.4.19 |
| **Роутинг** | React Router | 6.30.1 |
| **Дані (fetching)** | TanStack React Query | 5.83.0 |
| **Стан** | React Context API + localStorage | — |
| **БД** | Supabase (PostgreSQL) | клієнт 2.91.1 |
| **Автентифікація** | Supabase Auth (JWT) | — |
| **UI-компоненти** | shadcn/ui + Radix UI | — |
| **Стилі** | Tailwind CSS | 3.4.17 |
| **Форми** | React Hook Form + Zod | 7.61.1 / 3.25.76 |
| **Редактор** | TipTap | — |
| **Графіки** | Recharts | 2.15.4 |
| **Тести** | Vitest + Testing Library | 3.2.4 |
| **Лінтинг** | ESLint + TypeScript ESLint | 9.32.0 |

### Архітектурні особливості:
- **Чистий SPA** — жодного SSR/SSG, все рендериться на клієнті
- **Без окремого бекенду** — вся бізнес-логіка або на клієнті, або в Supabase (RLS, тригери, Edge Functions)
- **Тематична система** — теми реєструються в ThemeRegistry, кожна тема надає свої layouts/pages/components
- **Плагінна система** — HookRegistry дозволяє плагінам додавати UI та логіку в 50+ точок

---

## 3. Структура проекту

```
src/
├── main.tsx                        # Точка входу React
├── App.tsx                         # Root-компонент з провайдерами
├── index.css                       # Глобальні стилі + дизайн-система
│
├── components/
│   ├── admin/                      # Компоненти адмін-панелі
│   ├── catalog/                    # Каталог, фільтри, картка товару
│   ├── cart/                       # Кошик
│   ├── checkout/                   # Оформлення замовлення
│   ├── profile/                    # Профіль користувача
│   ├── reviews/                    # Відгуки
│   ├── plugins/                    # Плагінна система (PluginSlot)
│   ├── ui/                         # shadcn/ui примітиви
│   ├── ThemeRouter.tsx             # Головний роутер (React Router v6)
│   └── ThemeProvider.tsx           # Провайдер теми
│
├── pages/                          # Сторінки (дефолтна тема)
│   ├── Index.tsx                   # Головна
│   ├── Catalog.tsx                 # Каталог
│   ├── CatalogSection.tsx          # Розділ каталогу
│   ├── ProductDetail.tsx           # Картка товару
│   ├── Cart.tsx / Checkout.tsx     # Кошик / оформлення
│   ├── Auth.tsx                    # Авторизація
│   ├── Profile*.tsx                # Профіль (4 сторінки)
│   └── admin/                      # 40+ адмін-сторінок
│
├── themes/                         # Система тем
│   ├── default/                    # Дефолтна тема
│   └── beauty/                     # Альтернативна тема (зі своїми layouts/pages)
│
├── hooks/                          # Кастомні хуки
│   ├── useAuth.tsx                 # AuthContext (user, isAdmin, signOut)
│   ├── useCart.tsx                  # CartContext (items, add/remove, localStorage)
│   ├── usePriceType.ts             # Визначення типу цін
│   ├── useDiscountedPrice.ts       # Розрахунок знижок
│   ├── useProductReviews.ts        # Відгуки
│   └── useStock.ts                 # Залишки
│
├── integrations/supabase/          # Supabase клієнт та типи БД
├── lib/                            # Утиліти
│   ├── themes/                     # ThemeRegistry, ThemeContext
│   ├── plugins/                    # HookRegistry, PluginLoader
│   ├── shipping/                   # Розрахунок доставки
│   ├── discountEngine.ts           # Движок знижок
│   └── priceUtils.ts               # Утиліти цін
│
└── test/                           # Тести
```

---

## 4. Аналіз маршрутизації

### Публічні маршрути (SEO-критичні):
| Маршрут | Компонент | SSR-пріоритет |
|---------|-----------|---------------|
| `/` | Index.tsx | **ВИСОКИЙ** |
| `/catalog` | Catalog.tsx | **ВИСОКИЙ** |
| `/catalog/:sectionSlug` | CatalogSection.tsx | **ВИСОКИЙ** |
| `/catalog/:sectionSlug/:productSlug` | ProductDetail.tsx | **НАЙВИЩИЙ** |
| `/properties` | Properties.tsx | СЕРЕДНІЙ |
| `/properties/:propertySlug` | PropertyDetail.tsx | СЕРЕДНІЙ |
| `/properties/:propertySlug/:optionSlug` | PropertyPage.tsx | СЕРЕДНІЙ |

### Клієнтські (без потреби в SSR):
| Маршрут | Компонент | SSR-пріоритет |
|---------|-----------|---------------|
| `/cart` | Cart.tsx | НИЗЬКИЙ |
| `/checkout` | Checkout.tsx | НИЗЬКИЙ |
| `/order-success/:orderId` | OrderSuccess.tsx | НИЗЬКИЙ |
| `/auth` | Auth.tsx | НИЗЬКИЙ |

### Захищені (потребують авторизації):
| Маршрут | Компонент | SSR-пріоритет |
|---------|-----------|---------------|
| `/profile` | Profile.tsx | НІ |
| `/profile/orders` | ProfileOrders.tsx | НІ |
| `/profile/settings` | ProfileSettings.tsx | НІ |
| `/admin/*` | 40+ сторінок | НІ |

---

## 5. Аналіз для конвертації в Next.js SSR-first

### 5.1 Data Fetching — що потрібно змінити

**Поточний стан**: Всі дані завантажуються на клієнті через Supabase SDK + TanStack React Query.

```typescript
// Типовий патерн (ProductDetail.tsx):
const { data: product } = useQuery({
  queryKey: ["public-product", productSlug],
  queryFn: async () => {
    const { data } = await supabase
      .from("products")
      .select(`*, sections(*), product_modifications(*), product_prices(*)`)
      .eq("slug", productSlug)
      .eq("is_active", true)
      .maybeSingle();
    return data;
  },
});
```

**Що потрібно для Next.js**:
- Публічні сторінки: перенести запити в Server Components або `generateStaticParams` + ISR
- Створити серверний Supabase-клієнт (`@supabase/ssr`)
- TanStack Query залишити для клієнтських мутацій та dynamic-даних
- Складні nested-запити (product + modifications + prices + reviews) — виконувати на сервері одним запитом

### 5.2 Автентифікація — критична зміна

**Поточний стан**: Supabase Auth із `onAuthStateChange` listener, JWT в localStorage.

```typescript
// useAuth.tsx — SPA-патерн:
supabase.auth.onAuthStateChange(async (event, session) => {
  setUser(session?.user ?? null);
  // async admin check...
});
```

**Проблеми для SSR**:
- localStorage недоступний на сервері
- `onAuthStateChange` — чисто клієнтський API
- Admin-перевірка через setTimeout (race condition)

**Рішення для Next.js**:
- Використовувати `@supabase/ssr` (cookie-based sessions)
- Next.js Middleware для перевірки авторизації
- Server-side admin check без race conditions

### 5.3 Кошик — потрібна серверна персистенція

**Поточний стан**: Весь кошик зберігається тільки в localStorage.

```typescript
// useCart.tsx:
localStorage.setItem("solarstore-cart", JSON.stringify(items));
```

**Проблеми**: Неможливо рендерити стан кошика на сервері, hydration mismatch.

**Рішення**:
- Створити таблицю `carts` в Supabase
- Для авторизованих: синхронізація з БД
- Для гостей: cookie-based cart ID
- Клієнтський стан як оптимістичний кеш

### 5.4 Система тем — потребує рефакторингу

**Поточний стан**: Теми завантажуються динамічно через ThemeRegistry на клієнті, з loading-спінером.

**Проблеми**: Динамічне завантаження теми несумісне з SSR — сервер не знає, яку тему рендерити.

**Рішення**:
- Тема визначається на рівні конфігурації (env або DB при build-time)
- Тема-компоненти імпортуються статично або через dynamic import з `ssr: true`
- Fallback на дефолтну тему

### 5.5 Клієнтські залежності (browser-only)

Компоненти, що **вимагають `"use client"`**:
- Кошик (useCart, localStorage)
- Форми (react-hook-form)
- Карусель зображень (Embla)
- Rich-text редактор (TipTap)
- Тост-повідомлення (Sonner)
- Графіки (Recharts)
- Command palette (cmdk)
- Фільтри каталогу (інтерактивні)
- Вся адмін-панель

Компоненти, що **можуть бути Server Components**:
- Сторінки каталогу (layout, product grid, breadcrumbs)
- Картка товару (основна інформація, SEO-мета)
- Головна сторінка (банери, секції)
- Сторінки властивостей (статичний контент)
- Footer, Header (статичні частини)

---

## 6. Рекомендована структура Next.js (App Router)

```
app/
├── layout.tsx                          # Root layout (ThemeProvider, fonts)
├── globals.css                         # Tailwind + дизайн-система
│
├── (storefront)/                       # Публічні сторінки (SSR)
│   ├── layout.tsx                      # MainLayout (header, footer)
│   ├── page.tsx                        # / — Головна (SSR)
│   │
│   ├── catalog/
│   │   ├── page.tsx                    # /catalog (SSR + ISR)
│   │   └── [sectionSlug]/
│   │       ├── page.tsx                # /catalog/:section (SSR + ISR)
│   │       └── [productSlug]/
│   │           └── page.tsx            # /catalog/:section/:product (SSR + ISR)
│   │
│   ├── properties/
│   │   ├── page.tsx                    # /properties (SSR)
│   │   └── [propertySlug]/
│   │       ├── page.tsx                # (SSR)
│   │       └── [optionSlug]/page.tsx   # (SSR)
│   │
│   ├── cart/page.tsx                   # /cart ("use client")
│   ├── checkout/page.tsx               # /checkout ("use client")
│   └── order-success/[orderId]/page.tsx
│
├── auth/page.tsx                       # /auth ("use client")
│
├── (protected)/                        # Захищені маршрути
│   ├── layout.tsx                      # Auth middleware guard
│   └── profile/
│       ├── layout.tsx                  # ProfileLayout
│       ├── page.tsx
│       ├── orders/page.tsx
│       ├── orders/[orderId]/page.tsx
│       └── settings/page.tsx
│
├── admin/                              # Адмін-панель ("use client" цілком)
│   ├── layout.tsx                      # AdminLayout + middleware guard
│   ├── page.tsx                        # Dashboard
│   ├── products/page.tsx
│   ├── products/[productId]/page.tsx
│   ├── orders/page.tsx
│   ├── sections/page.tsx
│   ├── users/page.tsx
│   ├── settings/page.tsx
│   ├── themes/page.tsx
│   ├── plugins/page.tsx
│   ├── shipping/page.tsx
│   ├── discounts/page.tsx
│   └── [...інші 30+ сторінок]
│
├── api/                                # API Routes
│   ├── auth/callback/route.ts          # Supabase auth callback
│   ├── revalidate/route.ts             # On-demand ISR revalidation
│   └── guest-order/route.ts            # Guest order access
│
middleware.ts                           # Auth + admin перевірки
```

---

## 7. Таблиця критичності змін

| Аспект | Поточний стан | Потрібна зміна | Складність |
|--------|--------------|----------------|------------|
| **Роутинг** | React Router v6 | App Router (file-based) | ВИСОКА |
| **SSR для каталогу** | Немає (SPA) | Server Components + ISR | ВИСОКА |
| **SEO / Metadata** | Статичний index.html | generateMetadata, structured data | СЕРЕДНЯ |
| **Автентифікація** | localStorage JWT | Cookie-based (@supabase/ssr) | СЕРЕДНЯ |
| **Кошик** | localStorage | БД + cookies | СЕРЕДНЯ |
| **Оптимізація зображень** | Немає | next/image | НИЗЬКА |
| **Стилі (Tailwind)** | Tailwind 3 | Без змін (сумісний) | НИЗЬКА |
| **UI-компоненти** | shadcn/ui | Без змін (сумісний з Next.js) | НИЗЬКА |
| **TanStack Query** | Клієнтський | Залишити для client components | НИЗЬКА |
| **Форми** | react-hook-form + zod | Без змін ("use client") | НИЗЬКА |
| **Тематизація** | Динамічний ThemeRegistry | Статичний імпорт при build | СЕРЕДНЯ |
| **Плагіни** | HookRegistry | Потрібна адаптація для RSC | ВИСОКА |
| **Збірка** | Vite 5 | Next.js built-in (Turbopack) | СЕРЕДНЯ |
| **Тести** | Vitest | Залишити або перейти на Jest | НИЗЬКА |

---

## 8. Переваги міграції на Next.js SSR-first

1. **SEO**: Server-rendered HTML для каталогу та карток товарів — критично для e-commerce
2. **Швидкість першого завантаження**: HTML готовий на сервері, без JS waterfall
3. **ISR (Incremental Static Regeneration)**: Кешування сторінок товарів із фоновим оновленням
4. **Metadata API**: Динамічні OG-теги, structured data (Schema.org/Product)
5. **next/image**: Автоматична оптимізація зображень товарів (WebP, lazy loading, responsive)
6. **Middleware**: Серверна перевірка авторизації без client-side flash
7. **Streaming**: React Suspense boundaries для прогресивного рендерингу
8. **Edge Runtime**: Можливість запуску middleware на edge для швидкості

---

## 9. Ризики та застереження

1. **Складність плагінної системи**: HookRegistry працює виключно на клієнті — потрібна адаптація для Server Components
2. **Тематизація**: Динамічне перемикання тем runtime стає значно складнішим із SSR
3. **Supabase RLS**: При SSR запити йдуть від сервера — потрібен service_role ключ або правильна передача auth cookies
4. **Hydration mismatches**: localStorage-залежні компоненти (кошик, тема) потребують обережного підходу
5. **Час міграції**: Повна конвертація 40+ адмін-сторінок — значний обсяг роботи
6. **Два Supabase-клієнти**: Потрібен серверний і клієнтський, з правильним управлінням cookies

---

## 10. Рекомендована стратегія міграції

### Фаза 1: Фундамент
- Ініціалізація Next.js проекту (App Router)
- Налаштування Tailwind, shadcn/ui, шрифтів
- Налаштування Supabase SSR-клієнта (`@supabase/ssr`)
- Middleware для авторизації

### Фаза 2: Публічні сторінки (SSR-first)
- Головна сторінка (SSR)
- Каталог + розділи (SSR + ISR)
- Картка товару (SSR + ISR + generateMetadata)
- Сторінки властивостей (SSR)

### Фаза 3: Клієнтські інтерактивні сторінки
- Кошик + checkout ("use client")
- Авторизація
- Профіль користувача

### Фаза 4: Адмін-панель
- Перенесення AdminLayout
- Міграція 40+ сторінок (переважно "use client")
- Тематизація та плагіни

### Фаза 5: Оптимізація
- next/image для всіх зображень
- Structured data (Schema.org)
- Performance audit (Core Web Vitals)
- On-demand ISR revalidation через webhooks
