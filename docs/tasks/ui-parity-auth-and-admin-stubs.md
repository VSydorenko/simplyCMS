# Task: Відновлення UI-паритету авторизації та пропущених адмін-маршрутів

## Контекст

Після міграції з React SPA (Vite + React Router) на Next.js App Router, UI публічної частини
та адмін-панелі мав залишитися ідентичним. Адмін-панель (`packages/simplycms/admin/`) перенесена
коректно — layout, sidebar, всі 40 сторінок та 14 компонентів ідентичні оригіналу.

Проте сторінка авторизації `/auth` містить stub-заглушку замість повноцінного компонента, який вже
існує в ядрі. Також відсутні маршрути для 3 пунктів адмін-sidebar.

Пов'язано з BRD секціями: 6.2 (маршрути app/), 7.2 (підключення теми до app/), 9.3 (Client Components).

### Auth-інфраструктура (вже працює, не змінювати)

Авторизація побудована на **cookie-based SSR** підході через `@supabase/ssr`:

| Компонент | Файл | Опис |
|-----------|------|------|
| Browser client | `packages/simplycms/core/src/supabase/client.ts` | `createBrowserClient` (singleton) для Client Components |
| Server client | `packages/simplycms/core/src/supabase/server.ts` | `createServerClient` + `cookies()` для Server Components / Route Handlers |
| Proxy client | `packages/simplycms/core/src/supabase/proxy.ts` | `createServerClient` для `proxy.ts` — refresh tokens + cookies sync |
| Proxy | `proxy.ts` (корінь проєкту) | Auth guards: `/admin` (admin role), `/profile` (auth), `/auth` (redirect якщо вже logged in) |
| OAuth callback | `app/auth/callback/route.ts` | `exchangeCodeForSession` — обмін PKCE code → session → Set-Cookie |
| AuthProvider | `packages/simplycms/core/src/hooks/useAuth.tsx` | Client context: `onAuthStateChange` + `getSession` → user, isAdmin, signOut |
| CMSProvider | `packages/simplycms/core/src/providers/CMSProvider.tsx` | Обгортка: QueryClient + AuthProvider + CartProvider |

**Потік авторизації:**
```
Браузер (/auth UI) → supabase.auth.signInWithPassword / signUp / signInWithOAuth
  ↓ (для OAuth: redirect з code)
/auth/callback (Route Handler) → exchangeCodeForSession → Set-Cookie → redirect /
  ↓
proxy.ts (на кожному запиті до /admin, /profile, /auth)
  → createProxySupabaseClient → supabase.auth.getUser() → role check → pass/redirect
  ↓
Client Components → AuthProvider → onAuthStateChange → user state
```

> **Важливо:** Проєкт використовує `proxy.ts` (Next.js 16 конвеншен).
> Функція називається `proxy()`.

## Вимоги

### Частина 1: Виправлення сторінки авторизації

- [ ] Замінити stub в `app/auth/page.tsx` на підключення Auth з `@simplycms/core/pages/Auth`
- [ ] Зберегти паритет із `temp/src/pages/Auth.tsx` — все має виглядати ідентично
- [ ] `app/auth/page.tsx` — Server Component (для metadata); Auth-компонент — Client Component (вже має `'use client'`)
- [ ] Створити `app/auth/layout.tsx` — Server Component з `export const metadata` (title, description)
- [ ] Переконатися, що працюють: login (email/password), register (ім'я, прізвище, email, пароль, підтвердження), Google OAuth, show/hide password, Zod валідація, toast повідомлення
- [ ] Мова UI — українська (як в оригіналі)
- [ ] OAuth redirectTo має вказувати на `/auth/callback` (PKCE flow, cookie-based)

### Частина 2: Пропущені маршрути адмін-панелі

- [ ] Створити `app/(cms)/admin/services/page.tsx` — підключити PlaceholderPage
- [ ] Створити `app/(cms)/admin/service-requests/page.tsx` — підключити PlaceholderPage
- [ ] Створити `app/(cms)/admin/languages/page.tsx` — підключити PlaceholderPage
- [ ] PlaceholderPage вже існує в `@simplycms/admin/pages/PlaceholderPage` — використати його

## Clarify (вирішені питання)

### 1. Підключення auth: через тему чи ядро?

- **Рішення: Варіант B — імпорт з ядра** (`@simplycms/core/pages/Auth`).
- Обґрунтування: `/auth` не входить до `(storefront)/` route group і не належить до ThemeModule contract. Обидві теми (default, solarstore) і так реекспортують з ядра без будь-яких візуальних змін. Прямий імпорт з ядра — найпростіший і найстабільніший варіант.
- Наслідок: якщо в майбутньому теми захочуть кастомізувати auth UI, це буде окрема задача з розширенням ThemePages.

### 2. SSR metadata для `/auth` — Server Component wrapper чи client?

- **Рішення: Варіант C — `app/auth/layout.tsx` (Server Component) з metadata + `app/auth/page.tsx` (Server Component що рендерить Client Auth).**
- Обґрунтування на основі дослідження:
  - Next.js App Router: `metadata` та `generateMetadata` підтримуються **лише** в Server Components. Якщо `page.tsx` має `'use client'`, metadata export ігнорується.
  - Auth-компонент (`Auth.tsx` в ядрі) вже має `'use client'` — це правильно (форми, стан, обробники подій, `useRouter`, `useSearchParams`).
  - **Рішення:** створити `app/auth/layout.tsx` як Server Component з `export const metadata = { title: 'Авторизація' }`, а `app/auth/page.tsx` зробити Server Component що **імпортує та рендерить** Client Component Auth.
  - Це дозволяє: (a) metadata для SEO, (b) Auth працює як Client Component, (c) proxy.ts вже робить redirect для авторизованих з `/auth`, тому ніякої серверної логіки в page/layout не потрібно.
- Наслідок: page.tsx **не має** директиви `'use client'`. Він просто імпортує та рендерить Client Component.

### 3. Куди вказувати OAuth redirectTo?

- **Рішення: на `/auth/callback`** (вже існує).
- Обґрунтування: Supabase SSR документація рекомендує PKCE flow з серверним `exchangeCodeForSession` для консистентного cookie-based auth. `app/auth/callback/route.ts` вже реалізує цей обмін. Якщо redirectTo вказує на origin `/`, code→session обмін може не відбутися на сервері, і cookie не буде встановлено.
- **Перевірити в `packages/simplycms/core/src/pages/Auth.tsx`:** `handleGoogleLogin` має `redirectTo: window.location.origin + '/auth/callback'`. Якщо зараз просто `window.location.origin` — виправити.

### 4. Redirect після логіну

- **Рішення: На `/`** (поточна поведінка).
- `proxy.ts` вже перенаправляє авторизованих користувачів з `/auth` → `/`. Після `signInWithPassword` компонент робить `router.push('/')`. OAuth callback робить `redirect(next ?? '/')`. Все консистентно.

## Рекомендовані патерни

### Server Component page як обгортка для Client Component
`app/auth/page.tsx` — Server Component (без `'use client'`), який імпортує готовий Client Component:
- Де шукати приклад: `app/(storefront)/page.tsx` (HomePage), `app/(storefront)/cart/page.tsx`

### Layout з metadata для auth route
`app/auth/layout.tsx` — Server Component з `export const metadata` для title/description.
- Де шукати приклад: `app/(storefront)/layout.tsx`, `app/(protected)/layout.tsx`

### Адмін-сторінки як dynamic import без SSR
Всі адмін-сторінки підключаються через `dynamic(() => import(...), { ssr: false })` обгортку.
PlaceholderPage підключається так само.
- Де шукати приклад: `app/(cms)/admin/page.tsx` (Dashboard), `app/(cms)/admin/products/page.tsx`

### Cookie-based auth через proxy.ts
Проєкт використовує `proxy.ts` (Next.js 16 конвеншен). Proxy:
1. Створює Supabase client через `createProxySupabaseClient` (cookie-based).
2. Викликає `supabase.auth.getUser()` для валідації JWT (не `getSession()`!).
3. Перевіряє ролі для `/admin`, auth для `/profile`, redirect для `/auth`.
4. Повертає response з оновленими cookies.
- Де шукати: `proxy.ts`, `packages/simplycms/core/src/supabase/proxy.ts`

## Антипатерни (уникати)

### ❌ Створювати новий компонент авторизації
Повноцінний компонент вже існує в `@simplycms/core/pages/Auth`. Він ідентичний `temp/src/pages/Auth.tsx` (адаптований під Next.js). НЕ пишіть новий — підключіть існуючий.

### ❌ Використовувати нативні HTML елементи замість shadcn/ui
Поточний stub використовує `<input>`, `<button>`, `<label>` — це порушує дизайн-систему. Всі форми мають використовувати `@simplycms/ui` компоненти (Input, Button, Label, Card, Tabs).

### ❌ Англійські тексти в UI
Поточний stub написаний англійською ("Login", "Register", "Sign In"). Весь UI проекту — українською мовою. Компонент в ядрі вже має правильні українські тексти.

### ❌ Дублювати бізнес-логіку авторизації
Auth-логіка (Supabase signIn, signUp, OAuth) вже реалізована в `@simplycms/core/pages/Auth`. Не виносьте її в `app/auth/page.tsx`.

### ❌ Забувати про cookie-based auth redirect
OAuth callback вже правильно реалізований в `app/auth/callback/route.ts` через `@supabase/ssr`. Не створюйте альтернативних механізмів.

### ❌ Ставити `'use client'` в page.tsx для auth
`app/auth/page.tsx` має бути Server Component (без `'use client'`), щоб layout міг надати metadata. Auth-компонент з ядра вже має `'use client'` — не дублюйте.

### ❌ Додавати auth guards поза proxy.ts
Auth guards централізовані в `proxy.ts`. Не додавайте альтернативних механізмів для guards.

### ❌ Використовувати getSession() для серверної валідації
В proxy та Server Components використовуйте `getUser()` (надсилає запит до Supabase Auth) або `getClaims()` (валідує JWT локально). `getSession()` **не** валідує JWT на сервері.

## Архітектурні рішення

### Auth page
- **Пакет:** `app/auth/layout.tsx` (metadata) + `app/auth/page.tsx` (Server Component обгортка) → `@simplycms/core/pages/Auth` (Client Component)
- **Rendering стратегія:** Mixed — Server Component page/layout (metadata) + Client Component рендер (Auth)
- **Auth flow:** Browser client (`createBrowserClient` через singleton) → Supabase Auth API → cookie-based session via proxy
- **OAuth flow:** `signInWithOAuth` → redirect to Supabase → redirect to `/auth/callback` → `exchangeCodeForSession` → Set-Cookie → redirect `/`
- **Міграція з temp/:** `temp/src/pages/Auth.tsx` → вже перенесено в `packages/simplycms/core/src/pages/Auth.tsx`. Потрібно лише підключити.

### Пропущені адмін-маршрути
- **Пакет:** `app/(cms)/admin/` — тонкі обгортки, `@simplycms/admin/pages/PlaceholderPage` — компонент
- **Rendering стратегія:** Client-only (`dynamic(..., { ssr: false })`)
- **Міграція з temp/:** `temp/src/pages/admin/PlaceholderPage.tsx` → вже перенесено в `packages/simplycms/admin/src/pages/PlaceholderPage.tsx`

## Фази виконання

### Фаза 1: Підключення Auth UI (пріоритет)

**Мета:** Замінити stub на повноцінний Auth-компонент з ядра.

**Scope:**
- Створити `app/auth/layout.tsx` — Server Component з metadata
- Замінити `app/auth/page.tsx` — Server Component що рендерить Auth з ядра
- Перевірити OAuth redirectTo в `packages/simplycms/core/src/pages/Auth.tsx` (має бути `/auth/callback`)

**Ризики:**
- Auth компонент може мати незадоволені залежності (useAuth, useToast, supabase client) — перевірити що CMSProvider обгортає `/auth` route
- OAuth redirectTo може вказувати на `window.location.origin` замість `/auth/callback` — перевірити та виправити якщо потрібно

**Checklist:**
- [ ] `app/auth/layout.tsx` створено (Server Component, metadata: title "Авторизація | SolarStore")
- [ ] `app/auth/page.tsx` замінено (Server Component, імпорт Auth з `@simplycms/core/pages/Auth`)
- [ ] Перевірити що `app/layout.tsx` або `app/providers.tsx` обгортає Auth у CMSProvider (AuthProvider + QueryClient)
- [ ] Перевірити OAuth redirectTo → `/auth/callback`
- [ ] `pnpm typecheck` проходить

**DoD фази:** `/auth` відкривається, рендерить повноцінну форму (Tabs: Вхід/Реєстрація), Login/Register/OAuth працює, cookies встановлюються.

### Фаза 2: Адмін-маршрути placeholders

**Мета:** Додати 3 відсутні маршрути адмін-панелі.

**Scope:**
- Створити `app/(cms)/admin/services/page.tsx`
- Створити `app/(cms)/admin/service-requests/page.tsx`
- Створити `app/(cms)/admin/languages/page.tsx`

**Ризики:** мінімальні — патерн ідентичний існуючим Admin pages.

**Checklist:**
- [ ] 3 файли створено з `dynamic(() => import(...), { ssr: false })`
- [ ] Імпорт PlaceholderPage з `@simplycms/admin`
- [ ] `pnpm typecheck` проходить
- [ ] `pnpm lint` проходить

**DoD фази:** `/admin/services`, `/admin/service-requests`, `/admin/languages` → PlaceholderPage (не 404).

### Фаза 3: Верифікація та якість

**Мета:** Повна перевірка якості та консистентності auth flow.

**Scope:**
- `pnpm build` проходить без помилок
- `pnpm lint` проходить без помилок
- Перевірити cookie-based auth end-to-end

**Checklist:**
- [ ] `pnpm typecheck` ✅
- [ ] `pnpm lint` ✅
- [ ] `pnpm build` ✅

**DoD фази:** Всі перевірки пройдені, задача вважається завершеною.

## Файли для зміни/створення

### Зміна:
| Файл | Дія |
|------|-----|
| `app/auth/page.tsx` | Замінити stub на Server Component що рендерить Auth з ядра |

### Створення:
| Файл | Дія |
|------|-----|
| `app/auth/layout.tsx` | Server Component з metadata (title, description) |
| `app/(cms)/admin/services/page.tsx` | Нова сторінка → PlaceholderPage |
| `app/(cms)/admin/service-requests/page.tsx` | Нова сторінка → PlaceholderPage |
| `app/(cms)/admin/languages/page.tsx` | Нова сторінка → PlaceholderPage |

### Можлива зміна (перевірити):
| Файл | Дія |
|------|-----|
| `packages/simplycms/core/src/pages/Auth.tsx` | Перевірити `redirectTo` в `handleGoogleLogin` — має бути `window.location.origin + '/auth/callback'` |

## Існуючі компоненти (не змінювати, лише підключити)

| Компонент | Шлях | Статус |
|-----------|------|--------|
| Auth (повний, 'use client') | `packages/simplycms/core/src/pages/Auth.tsx` | Готовий (464 рядки) |
| AuthPage (реекспорт default) | `themes/default/pages/AuthPage.tsx` | Готовий |
| AuthPage (реекспорт solarstore) | `themes/solarstore/pages/AuthPage.tsx` | Готовий |
| PlaceholderPage | `packages/simplycms/admin/src/pages/PlaceholderPage.tsx` | Готовий |
| Auth callback | `app/auth/callback/route.ts` | Готовий (exchangeCodeForSession) |
| Proxy (auth guards) | `proxy.ts` | Готовий (getUser + role check) |
| Browser client | `packages/simplycms/core/src/supabase/client.ts` | Готовий (createBrowserClient singleton) |
| Server client | `packages/simplycms/core/src/supabase/server.ts` | Готовий (createServerClient + cookies) |
| Proxy client | `packages/simplycms/core/src/supabase/proxy.ts` | Готовий (createProxySupabaseClient) |
| AuthProvider | `packages/simplycms/core/src/hooks/useAuth.tsx` | Готовий (onAuthStateChange + getSession) |
| CMSProvider | `packages/simplycms/core/src/providers/CMSProvider.tsx` | Готовий (QueryClient + Auth + Cart) |

## MCP Servers (за потреби)
- **context7** — перевірити Next.js `dynamic()` API, metadata в layout
- **shadcn** — не потрібен (всі компоненти вже є)
- **supabase** — не потрібен (auth інтеграція вже працює в ядрі)

## Пов'язана документація
- `BRD_SIMPLYCMS_NEXTJS.md` секція 6.2 — структура `app/` та маршрути
- `BRD_SIMPLYCMS_NEXTJS.md` секція 7.2 — як тема підключається до `app/`
- `BRD_SIMPLYCMS_NEXTJS.md` секція 9.3 — Server vs Client Components
- `BRD_SIMPLYCMS_NEXTJS.md` секція 10 — автентифікація та авторизація
- `.github/instructions/architecture-core.instructions.md` — rendering стратегії
- `.github/instructions/ui-architecture.instructions.md` — UI компоненти та теми
- `.github/instructions/data-access.instructions.md` — Supabase клієнти, auth patterns
- Supabase SSR docs: "Creating a client for SSR" → proxy + browser client + server client
- Supabase SSR docs: "OAuth with PKCE flow for SSR" → callback route + exchangeCodeForSession
- `temp/src/pages/Auth.tsx` — референсний код оригінальної авторизації (read-only)

## Definition of Done

### Auth UI
- [ ] `/auth` рендерить повноцінну форму авторизації/реєстрації ідентичну `temp/src/pages/Auth.tsx`
- [ ] `app/auth/page.tsx` — Server Component (без `'use client'`), рендерить Auth з ядра
- [ ] `app/auth/layout.tsx` — Server Component з metadata (title: "Авторизація | SolarStore")
- [ ] Форма входу працює (email + password + Zod валідація + toast) → cookie встановлюється
- [ ] Форма реєстрації працює (ім'я + прізвище + email + пароль + підтвердження)
- [ ] Google OAuth кнопка присутня і працює (redirectTo → `/auth/callback`)
- [ ] Show/hide password працює
- [ ] Українська мова у всіх текстах
- [ ] Логотип SolarStore + брендінг відображається
- [ ] Кнопка "Повернутися на головну" працює
- [ ] proxy.ts правильно перенаправляє авторизованих з `/auth` → `/`

### Адмін-маршрути
- [ ] `/admin/services` → PlaceholderPage (не 404)
- [ ] `/admin/service-requests` → PlaceholderPage (не 404)
- [ ] `/admin/languages` → PlaceholderPage (не 404)

### Якість
- [ ] `pnpm typecheck` проходить без помилок
- [ ] `pnpm lint` проходить без помилок
- [ ] `pnpm build` проходить без помилок
