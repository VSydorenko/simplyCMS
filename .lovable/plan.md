
# План: Глобальні опції властивостей зі сторінками

## Огляд
Створення системи глобальних опцій властивостей (наприклад, виробників, матеріалів), які можна використовувати в різних розділах каталогу та мати окремі сторінки з описом, зображенням і SEO-інформацією.

## Нова архітектура даних

```text
+-------------------+       +--------------------+       +-------------------+
| section_properties|------>| property_options   |<------| property_pages    |
+-------------------+       +--------------------+       +-------------------+
| id                |       | id                 |       | id                |
| name              |       | property_id (FK)   |       | option_id (FK)    |
| code              |       | name               |       | slug              |
| property_type     |       | slug               |       | description       |
| has_page          |       | sort_order         |       | image_url         |
| ...               |       | created_at         |       | meta_title        |
+-------------------+       +--------------------+       | meta_description  |
                                    ^                    +-------------------+
                                    |
                            +-------+--------+
                            | product_property_values
                            +----------------+
                            | product_id     |
                            | property_id    |
                            | option_id (new)|  <-- замість text value
                            +----------------+
```

## Етапи реалізації

### Етап 1: Зміни в базі даних

1. **Створити таблицю `property_options`**
   - `id` (UUID, PK)
   - `property_id` (FK -> section_properties)
   - `name` (TEXT) - назва опції ("Samsung", "LG")
   - `slug` (VARCHAR) - URL-сумісний ідентифікатор
   - `sort_order` (INT)
   - `created_at` (TIMESTAMP)

2. **Оновити таблицю `property_pages`**
   - Змінити `property_id` на `option_id` (FK -> property_options)
   - Тепер сторінка прив'язана до конкретної опції, а не до властивості

3. **Оновити таблицю `product_property_values`**
   - Додати `option_id` (UUID, nullable) для зв'язку з опціями
   - Для select/multiselect використовувати `option_id`
   - Для text/number залишити `value`/`numeric_value`

4. **RLS політики для нових таблиць**
   - Публічне читання для каталогу
   - Редагування тільки для адміністраторів

### Етап 2: Адмін-панель - Управління опціями

1. **Оновити діалог редагування властивості** (`SectionProperties.tsx`)
   - Замінити textarea на список опцій з картками
   - Кожна опція показує: назва, slug, кнопки "Редагувати сторінку" / "Видалити"
   - Кнопка "Додати опцію" відкриває форму

2. **Форма додавання/редагування опції**
   - Назва (text)
   - Slug (auto-generate або manual)
   - Порядок сортування

3. **Сторінка редагування property_page** (окрема сторінка або модальне вікно)
   - Назва (успадковується з опції)
   - Опис (Rich Text Editor)
   - Зображення (ImageUpload)
   - SEO: meta_title, meta_description

### Етап 3: Оновлення вибору властивостей у товарі

1. **Оновити `ProductPropertyValues.tsx`**
   - Для select: показувати опції з таблиці `property_options`
   - Зберігати `option_id` замість текстового value

### Етап 4: Каталог та фільтри

1. **Оновити `FilterSidebar.tsx`**
   - Завантажувати опції з `property_options`
   - Фільтрувати по `option_id`

2. **Створити публічну сторінку опції** (наприклад, `/manufacturer/samsung`)
   - Показувати опис, зображення
   - Список товарів з цією опцією

### Етап 5: Маршрутизація

1. Додати маршрут `/admin/properties/:propertyId/options` для управління опціями
2. Додати публічний маршрут `/:propertyCode/:optionSlug` для сторінок опцій

---

## Технічні деталі

### Нова таблиця property_options
```sql
CREATE TABLE public.property_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.section_properties(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(property_id, slug)
);
```

### Зміни в property_pages
```sql
ALTER TABLE public.property_pages 
    DROP COLUMN property_id,
    ADD COLUMN option_id UUID REFERENCES public.property_options(id) ON DELETE CASCADE NOT NULL;
```

### Зміни в product_property_values
```sql
ALTER TABLE public.product_property_values 
    ADD COLUMN option_id UUID REFERENCES public.property_options(id) ON DELETE SET NULL;
```

---

## Файли, що будуть змінені/створені

### Нові файли:
- `src/pages/admin/PropertyOptions.tsx` - управління опціями властивості
- `src/pages/admin/PropertyPageEdit.tsx` - редагування сторінки опції
- `src/pages/PropertyPage.tsx` - публічна сторінка опції

### Файли для оновлення:
- `src/pages/admin/SectionProperties.tsx` - додати посилання на управління опціями
- `src/components/admin/ProductPropertyValues.tsx` - працювати з option_id
- `src/components/catalog/FilterSidebar.tsx` - завантажувати property_options
- `src/pages/Catalog.tsx` та `src/pages/CatalogSection.tsx` - фільтрація по option_id
- `src/App.tsx` - нові маршрути

---

## Міграція існуючих даних

Якщо в базі вже є товари з текстовими значеннями властивостей:
1. Створити опції на основі унікальних значень
2. Оновити product_property_values.option_id відповідно до створених опцій
3. Очистити застарілі текстові значення (опціонально)

---

## Порядок виконання

1. Міграція бази даних (таблиці + RLS)
2. Адмін: управління опціями
3. Адмін: редагування сторінок опцій
4. Товари: вибір опцій замість тексту
5. Каталог: оновлення фільтрів
6. Публічні сторінки опцій
