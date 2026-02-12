# Task: Технічний борг Фази 5 — залишковий `any`

## Контекст

Під час виконання Фази 5 задачі `typesafety-and-modernization.md` (видалення `any` з admin, plugin-system, chart.tsx) було виявлено випадки, де `any` неможливо усунути без зміни зовнішніх залежностей або upstream-патчу. Ці випадки задокументовані нижче.

**Стек:** Zod 4.3.6, @hookform/resolvers 5.2.2, react-hook-form 7.71.1, Recharts (shadcn/ui chart.tsx).

---

## Залишковий `any`

### 1. `zodResolver` + `z.coerce.number()` (Zod 4 / @hookform/resolvers)

**Файли:**
- `packages/simplycms/admin/src/pages/PriceTypeEdit.tsx`
- `packages/simplycms/admin/src/pages/UserCategoryRuleEdit.tsx`

**Проблема:**
`z.coerce.number()` у Zod 4 повертає `ZodPipe<ZodUnknown, ZodNumber>` — тип `input` стає `unknown`. При передачі такої схеми в `zodResolver()`, тип `TFieldValues` не збігається з `FieldValues` (react-hook-form), що спричиняє помилку TS2322:

```
Type 'Resolver<{ sort_order: number; ... }>' is not assignable to type
'Resolver<{ sort_order: number; ... }>'.
  Types of property '...' are incompatible.
```

**Поточне рішення:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any
resolver: zodResolver(schema) as any,
```

**Правильне виправлення:**
- Чекати на виправлення в `@hookform/resolvers` (підтримка Zod 4 `z.coerce` input types)
- Або створити типізований wrapper `safeZodResolver<T>()` що правильно обробляє coerce-схеми
- GitHub issue для відстеження: https://github.com/react-hook-form/resolvers/issues

### 2. Recharts callback types (shadcn/ui chart.tsx)

**Файл:** `packages/simplycms/ui/src/chart.tsx`

**Проблема:**
Recharts API внутрішньо типізує payload як `any`. Компоненти `ChartTooltipContent` та `ChartLegendContent` отримують `payload` від Recharts і працюють з `item.payload`, `item.dataKey`, `item.value`, `item.name`, `item.color` — всі ці властивості не мають типізації у Recharts.

Заміна `any` → `unknown` ламає доступ до цих властивостей (TS18046: `unknown` is of type `unknown`).

**Поточне рішення:**
```typescript
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Recharts API boundary
payload?: Array<Record<string, any>>;
```

**Правильне виправлення:**
- Створити типізований інтерфейс `RechartsPayloadItem` з усіма відомими полями:
  ```typescript
  interface RechartsPayloadItem {
    name?: string;
    value?: string | number;
    dataKey?: string | number;
    color?: string;
    fill?: string;
    payload?: Record<string, unknown>;
    [key: string]: unknown;
  }
  ```
- Замінити `Array<Record<string, any>>` на `RechartsPayloadItem[]`
- Або чекати на типізацію від Recharts upstream

---

## Критерії завершення

- [ ] `zodResolver` працює без `as any` з `z.coerce.number()` схемами
- [ ] `chart.tsx` не містить `any` — всі Recharts payload типізовані
- [ ] `pnpm typecheck` проходить без помилок
- [ ] Видалено всі `eslint-disable` коментарі для `@typescript-eslint/no-explicit-any`

## Пріоритет

**Низький** — `eslint-disable` коментарі ізолюють проблему, typecheck проходить. Виправити при оновленні Zod/resolvers або Recharts.
