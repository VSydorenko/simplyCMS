# SimplyCMS — Seed Migrations (Reference)

Ці міграції є **референсною копією** SQL-схеми, яку потребує ядро SimplyCMS.

## Призначення

Коли новий сайт підключає SimplyCMS через Git Subtree, ці файли
копіюються в `supabase/migrations/` проекту як початкова схема бази даних.

## Використання

```bash
# Скопіювати seed-міграції в проект
cp packages/simplycms/schema/seed-migrations/*.sql supabase/migrations/

# Застосувати міграції
pnpm db:migrate

# Згенерувати TypeScript типи
pnpm db:generate-types
```

## Важливо

- Ці файли є **read-only** для сайту — не редагуйте їх напряму
- Сайт може додавати **власні міграції** в `supabase/migrations/` поруч з seed-файлами
- Після зміни схеми завжди запускайте `pnpm db:generate-types`
