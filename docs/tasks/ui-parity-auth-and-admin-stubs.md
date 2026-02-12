# Task: Відновлення UI-паритету авторизації та пропущених адмін-маршрутів

## Контекст

Після міграції з React SPA (Vite + React Router) на Next.js App Router, UI публічної частини
та адмін-панелі мав залишитися ідентичним. Адмін-панель (`packages/simplycms/admin/`) перенесена
коректно — layout, sidebar, всі 40 сторінок та 14 компонентів ідентичні оригіналу.

Проте сторінка авторизації `/auth` містить stub-заглушку замість повноцінного компонента, який вже
існує в ядрі. Також відсутні маршрути для 3 пунктів адмін-sidebar.

Пов'язано з BRD секціями: 6.2 (маршрути app/), 7.2 (підключення теми до app/), 9.3 (Client Components).

## Вимоги

### Частина 1: Виправлення сторінки авторизації

- [ ] Замінити stub в `app/auth/page.tsx` на підключення `AuthPage` з активної теми
- [ ] Зберегти паритет із `temp/src/pages/Auth.tsx` — все має виглядати ідентично
- [ ] Auth-сторінка має залишатися `'use client'` (форми, стан, обробники подій)
- [ ] Переконатися, що працюють: login (email/password), register (ім'я, прізвище, email, пароль, підтвердження), Google OAuth, show/hide password, Zod валідація, toast повідомлення
- [ ] Мова UI — українська (як в оригіналі)

### Частина 2: Пропущені маршрути адмін-панелі

- [ ] Створити `app/(cms)/admin/services/page.tsx` — підключити PlaceholderPage
- [ ] Створити `app/(cms)/admin/service-requests/page.tsx` — підключити PlaceholderPage
- [ ] Створити `app/(cms)/admin/languages/page.tsx` — підключити PlaceholderPage
- [ ] PlaceholderPage вже існує в `@simplycms/admin/pages/PlaceholderPage` — використати його

## Clarify (питання перед імплементацією)

- [Х] Чи потрібно підключати auth через тему, чи напряму з ядра?
  - Чому це важливо: У storefront-сторінках використовується прямий імпорт з теми (`@themes/default/pages/HomePage`). Auth-сторінка не належить до storefront route group — вона окремо.
  - Варіанти:
    - **A)** Імпортувати напряму з теми: `import AuthPage from '@themes/default/pages/AuthPage'` — як роблять інші storefront-сторінки.
    - **B)** Імпортувати з ядра: `import Auth from '@simplycms/core/pages/Auth'` — простіше, обидві теми і так реекспортують з ядра.
    - **C)** Динамічна резолвація теми через ThemeContext — складніше, але правильніше архітектурно.
  - Рішення: Варіант B - Імпортувати з ядра.
  - Вплив на рішення: архітектура / тема

- [ ] Чи потрібна `app/auth/page.tsx` як Server Component обгортка (SSR metadata) чи чисто client?
  - Чому це важливо: Інші storefront-сторінки мають серверну обгортку для metadata та data fetching, а auth-сторінка не потребує SSR-даних.
  - Варіанти:
    - **A)** Server Component обгортка з `export const metadata` + client-рендер AuthPage
    - **B)** Повністю client (`'use client'` + dynamic import)
  - Рекомендація: Варіант A — додати metadata для SEO (title: "Авторизація"), але основний рендер через client AuthPage.
  - Вплив на рішення: SEO / rendering стратегія

## Рекомендовані патерни

### Підключення тематичних сторінок в app/
Всі storefront-сторінки підключають компоненти теми через прямий імпорт.
Auth не є частиною `(storefront)/` route group, але архітектурно слідує тому ж підходу — тема визначає візуал.
- Де шукати приклад: `app/(storefront)/page.tsx` (імпорт HomePage з теми), `app/(storefront)/catalog/page.tsx`

### Адмін-сторінки як dynamic import без SSR
Всі адмін-сторінки підключаються через `dynamic(() => import(...), { ssr: false })` обгортку.
PlaceholderPage підключається так само.
- Де шукати приклад: `app/(cms)/admin/page.tsx` (Dashboard), `app/(cms)/admin/products/page.tsx`

### Ланцюжок реекспортів для Auth
Тема реекспортує з ядра: `themes/default/pages/AuthPage.tsx` → `@simplycms/core/pages/Auth`.
Ядро має повноцінний компонент (462 рядки). Не треба нічого переписувати — достатньо правильно підключити.
- Де шукати приклад: `packages/simplycms/core/src/pages/Auth.tsx`, `themes/default/pages/AuthPage.tsx`

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

## Архітектурні рішення

### Auth page
- **Пакет:** `app/auth/page.tsx` (тонка обгортка) → `@themes/default/pages/AuthPage` → `@simplycms/core/pages/Auth`
- **Rendering стратегія:** Mixed — Server Component обгортка (metadata) + Client Component рендер
- **Міграція з temp/:** `temp/src/pages/Auth.tsx` → вже перенесено в `packages/simplycms/core/src/pages/Auth.tsx`. Потрібно лише підключити.

### Пропущені адмін-маршрути
- **Пакет:** `app/(cms)/admin/` — тонкі обгортки, `@simplycms/admin/pages/PlaceholderPage` — компонент
- **Rendering стратегія:** Client-only (`dynamic(..., { ssr: false })`)
- **Міграція з temp/:** `temp/src/pages/admin/PlaceholderPage.tsx` → вже перенесено в `packages/simplycms/admin/src/pages/PlaceholderPage.tsx`

## Файли для зміни/створення

### Зміна:
| Файл | Дія |
|------|-----|
| `app/auth/page.tsx` | Замінити stub на підключення AuthPage з теми |

### Створення:
| Файл | Дія |
|------|-----|
| `app/(cms)/admin/services/page.tsx` | Нова сторінка → PlaceholderPage |
| `app/(cms)/admin/service-requests/page.tsx` | Нова сторінка → PlaceholderPage |
| `app/(cms)/admin/languages/page.tsx` | Нова сторінка → PlaceholderPage |

## Існуючі компоненти (не змінювати, лише підключити)

| Компонент | Шлях | Статус |
|-----------|------|--------|
| Auth (повний) | `packages/simplycms/core/src/pages/Auth.tsx` | Готовий (462 рядки) |
| AuthPage (реекспорт default) | `themes/default/pages/AuthPage.tsx` | Готовий |
| AuthPage (реекспорт solarstore) | `themes/solarstore/pages/AuthPage.tsx` | Готовий |
| PlaceholderPage | `packages/simplycms/admin/src/pages/PlaceholderPage.tsx` | Готовий |
| Auth callback | `app/auth/callback/route.ts` | Готовий |

## MCP Servers (за потреби)
- **context7** — перевірити Next.js `dynamic()` API та `generateMetadata` для client-heavy сторінок
- **shadcn** — не потрібен (всі компоненти вже є)
- **supabase** — не потрібен (auth інтеграція вже працює в ядрі)

## Пов'язана документація
- `BRD_SIMPLYCMS_NEXTJS.md` секція 6.2 — структура `app/` та маршрути
- `BRD_SIMPLYCMS_NEXTJS.md` секція 7.2 — як тема підключається до `app/`
- `BRD_SIMPLYCMS_NEXTJS.md` секція 9.3 — Server vs Client Components
- `BRD_SIMPLYCMS_NEXTJS.md` секція 10 — автентифікація та авторизація
- `.github/instructions/architecture-core.instructions.md` — rendering стратегії
- `.github/instructions/ui-architecture.instructions.md` — UI компоненти та теми
- `temp/src/pages/Auth.tsx` — референсний код оригінальної авторизації (read-only)

## Definition of Done

- [ ] `/auth` рендерить повноцінну форму авторизації/реєстрації ідентичну `temp/src/pages/Auth.tsx`
- [ ] Форма входу працює (email + password + Zod валідація + toast)
- [ ] Форма реєстрації працює (ім'я + прізвище + email + пароль + підтвердження)
- [ ] Google OAuth кнопка присутня і працює
- [ ] Show/hide password працює
- [ ] Українська мова у всіх текстах
- [ ] Логотип SolarStore + брендінг відображається
- [ ] Кнопка "Повернутися на головну" працює
- [ ] `/admin/services` → PlaceholderPage (не 404)
- [ ] `/admin/service-requests` → PlaceholderPage (не 404)
- [ ] `/admin/languages` → PlaceholderPage (не 404)
- [ ] `pnpm typecheck` проходить без помилок
- [ ] `pnpm lint` проходить без помилок
- [ ] `pnpm build` проходить без помилок
