
# План: Глобальні опції властивостей

## Статус: Виконано ✅

## Архітектура даних

```text
+-------------------+       +--------------------+
| section_properties|------>| property_options   |
+-------------------+       +--------------------+
| id                |       | id                 |
| name              |       | property_id (FK)   |
| code              |       | name               |
| property_type     |       | slug               |
| has_page          |       | sort_order         |
| ...               |       | description        | <- Page content
+-------------------+       | image_url          | <- Page image
        ^                   | meta_title         | <- SEO
        |                   | meta_description   | <- SEO
+-------+--------+          | created_at         |
| section_property_assignments    +--------------------+
+----------------+                      ^
| section_id     |                      |
| property_id    |              +-------+--------+
| sort_order     |              | product_property_values
+----------------+              +----------------+
                                | product_id     |
                                | property_id    |
                                | option_id      |
                                +----------------+
                                        |
                                +-------+--------+
                                | modification_property_values
                                +----------------+
                                | modification_id|
                                | property_id    |
                                | option_id      |
                                +----------------+
```

## Виконані етапи

### База даних ✅

1. ✅ **Таблиця `property_options`** з полями для сторінки
2. ✅ **Таблиця `section_property_assignments`** - зв'язок властивостей з розділами
3. ✅ **Таблиця `modification_property_values`** - властивості для модифікацій
4. ✅ **Видалено таблицю `property_pages`** - інтегровано в `property_options`

### Адмін-панель ✅

1. ✅ **Глобальне управління властивостями** (`Properties.tsx`)
2. ✅ **Редагування властивості** (`PropertyEdit.tsx`)
   - Клік на рядок опції відкриває окрему сторінку редагування
3. ✅ **Окрема сторінка редагування опції** (`PropertyOptionEdit.tsx`)
   - Основна інформація: назва, slug, сортування
   - Сторінка: зображення, опис
   - SEO: meta_title, meta_description
4. ✅ **Призначення властивостей розділам** (`SectionPropertiesTable.tsx`)
5. ✅ **Властивості для модифікацій** (`ProductModifications.tsx`)
   - Розкривний блок "Властивості модифікації" у діалозі

### Каталог ✅

1. ✅ **Фільтри** (`FilterSidebar.tsx`)
   - Враховують властивості товарів і модифікацій
2. ✅ **Сторінка опції** (`PropertyPage.tsx`)
   - Дані з `property_options`

### Маршрутизація ✅

- `/admin/properties` - список властивостей
- `/admin/properties/:propertyId` - редагування властивості
- `/admin/properties/:propertyId/options/new` - нова опція
- `/admin/properties/:propertyId/options/:optionId` - редагування опції
- `/:propertyCode/:optionSlug` - публічна сторінка опції

---

## Наступні кроки (опціонально)

- [ ] Drag-and-drop для сортування опцій
- [ ] Масовий імпорт опцій з CSV
- [ ] Лічильник товарів у фільтрах
