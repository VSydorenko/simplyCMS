
# План: Глобальні опції властивостей зі сторінками

## Огляд
Створення системи глобальних опцій властивостей (наприклад, виробників, матеріалів), які можна використовувати в різних розділах каталогу та мати вбудовані сторінки з описом, зображенням і SEO-інформацією.

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
```

## Виконані етапи

### Етап 1: База даних ✅

1. ✅ **Таблиця `property_options`** з полями для сторінки:
   - `id`, `property_id`, `name`, `slug`, `sort_order`
   - `description` - опис (HTML)
   - `image_url` - зображення
   - `meta_title`, `meta_description` - SEO

2. ✅ **Таблиця `section_property_assignments`** - зв'язок властивостей з розділами

3. ✅ **Видалено таблицю `property_pages`** - функціонал інтегровано в `property_options`

### Етап 2: Адмін-панель ✅

1. ✅ **Глобальне управління властивостями** (`Properties.tsx`)
   - Список всіх властивостей
   - Створення нових властивостей

2. ✅ **Редагування властивості** (`PropertyEdit.tsx`)
   - Основна інформація (назва, код, тип)
   - Управління опціями з вкладками:
     - Основне: назва, slug, сортування
     - Сторінка: зображення, опис, SEO

3. ✅ **Призначення властивостей розділам** (`SectionPropertiesTable.tsx`)
   - Додавання глобальних властивостей до розділу

### Етап 3: Каталог ✅

1. ✅ **Фільтри** (`FilterSidebar.tsx`)
   - Завантаження властивостей через `section_property_assignments`
   - Опції з таблиці `property_options`

2. ✅ **Сторінка опції** (`PropertyPage.tsx`)
   - Дані беруться безпосередньо з `property_options`
   - Показує опис, зображення, товари

### Етап 4: Маршрутизація ✅

- `/admin/properties` - список властивостей
- `/admin/properties/:propertyId` - редагування властивості з опціями
- `/:propertyCode/:optionSlug` - публічна сторінка опції

---

## Видалені файли

- `src/pages/admin/PropertyPageEdit.tsx` - більше не потрібен
- `src/pages/admin/PropertyOptions.tsx` - інтегровано в PropertyEdit
- `src/pages/admin/SectionProperties.tsx` - замінено на глобальну систему

---

## Наступні кроки (опціонально)

- [ ] Drag-and-drop для сортування опцій
- [ ] Масовий імпорт опцій з CSV
- [ ] Лічильник товарів у фільтрах
- [ ] Пошук та пагінація в списку властивостей
