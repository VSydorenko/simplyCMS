# Task: Рефакторинг типізації Banner (Json → BannerButton[])

## Контекст

Виявлено під час Фази 4 **typesafety-and-modernization** задачі. Supabase генерує `Tables<'banners'>.buttons` як `Json` (загальний тип для JSONB колонок), але вся бізнес-логіка очікує `BannerButton[]` (конкретний масив з `text`, `url`, `target`, `variant`). Аналогічна проблема для `schedule_days: Json` vs `number[]`.

## Проблема

Два місця з `as unknown as BannerButton[]`:
1. `packages/simplycms/core/src/hooks/useBanners.ts:83` — в `useBanners` хуку
2. `app/(storefront)/page.tsx:36` — в серверній сторінці (`as unknown as Banner[]`)

Каст `as unknown as` обходить type safety і може маскувати помилки якщо DB-схема зміниться.

## Рішення

### Створити утиліту `parseBannerRow`

```typescript
// packages/simplycms/core/src/lib/bannerUtils.ts

import type { Tables } from '../supabase/types';
import type { Banner, BannerButton } from '../hooks/useBanners';

/** Перетворює рядок Supabase banners на типізований Banner */
export function parseBannerRow(row: Tables<'banners'>): Banner {
  return {
    ...row,
    buttons: parseBannerButtons(row.buttons),
    schedule_days: Array.isArray(row.schedule_days)
      ? (row.schedule_days as number[])
      : null,
  };
}

function parseBannerButtons(raw: unknown): BannerButton[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isBannerButton);
}

function isBannerButton(item: unknown): item is BannerButton {
  if (typeof item !== 'object' || item === null) return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.text === 'string' &&
    typeof obj.url === 'string' &&
    typeof obj.target === 'string' &&
    typeof obj.variant === 'string'
  );
}
```

### Оновити useBanners

Замінити inline каст на `parseBannerRow`:
```typescript
const banners = data.map(parseBannerRow);
```

### Оновити серверну сторінку

```typescript
// app/(storefront)/page.tsx
import { parseBannerRow } from '@simplycms/core/lib/bannerUtils';
// ...
banners={(banners.data || []).map(parseBannerRow)}
```

## Зачеплені файли

- `packages/simplycms/core/src/lib/bannerUtils.ts` — НОВИЙ
- `packages/simplycms/core/src/hooks/useBanners.ts` — рефакторинг
- `app/(storefront)/page.tsx` — видалити `as unknown as Banner[]`

## Оцінка

~30 хв. Тривіальний рефакторинг без зміни поведінки.
