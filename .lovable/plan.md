
# План: Глобальні опції властивостей зі сторінками

## Огляд
Створення системи глобальних опцій властивостей (наприклад, виробників, матеріалів), які можна використовувати в різних розділах каталогу та мати окремі сторінки з описом, зображенням і SEO-інформацією.

## Статус: В процесі реалізації ✅

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

### Етап 1: Зміни в базі даних ✅ ВИКОНАНО

1. ✅ **Створено таблицю `property_options`**
   - `id` (UUID, PK)
   - `property_id` (FK -> section_properties)
   - `name` (TEXT) - назва опції ("Samsung", "LG")
   - `slug` (VARCHAR) - URL-сумісний ідентифікатор
   - `sort_order` (INT)
   - `created_at` (TIMESTAMP)

2. ✅ **Оновлено таблицю `property_pages`**
   - Додано `option_id` (FK -> property_options)
   - `property_id` зроблено nullable для перехідного періоду

3. ✅ **Оновлено таблицю `product_property_values`**
   - Додано `option_id` (UUID, nullable) для зв'язку з опціями

4. ✅ **RLS політики**
   - Публічне читання для каталогу
   - Редагування тільки для адміністраторів

### Етап 2: Адмін-панель - Управління опціями ✅ ВИКОНАНО

1. ✅ **Сторінка управління опціями** (`PropertyOptions.tsx`)
   - Список опцій з кнопками редагування/видалення
   - Створення нових опцій з автогенерацією slug
   - Посилання на редагування сторінки опції

2. ✅ **Оновлено SectionProperties.tsx**
   - Додано колонку "Опції" з кнопкою переходу до управління опціями
   - Кнопка показується для select/multiselect властивостей

3. ✅ **Сторінка редагування property_page** (`PropertyPageEdit.tsx`)
   - Назва сторінки
   - Опис (Rich Text Editor)
   - Зображення (ImageUpload)
   - SEO: meta_title, meta_description

### Етап 3: Оновлення вибору властивостей у товарі ✅ ВИКОНАНО

1. ✅ **Оновлено `ProductPropertyValues.tsx`**
   - Для select: показує опції з таблиці `property_options`
   - Зберігає `option_id` разом з текстовим value
   - Fallback на legacy options якщо property_options порожній

### Етап 4: Каталог та фільтри ✅ ВИКОНАНО

1. ✅ **Оновлено `FilterSidebar.tsx`**
   - Завантажує опції з `property_options`
   - Fallback на legacy options
   - Фільтрує по назві опції (для зворотної сумісності)

2. ✅ **Створено публічну сторінку опції** (`PropertyPage.tsx`)
   - Показує опис, зображення з property_pages
   - Список товарів з цією опцією

### Етап 5: Маршрутизація ✅ ВИКОНАНО

1. ✅ Маршрут `/admin/properties/:propertyId/options` для управління опціями
2. ✅ Маршрут `/admin/property-pages/:pageId` для редагування сторінок
3. ✅ Публічний маршрут `/:propertyCode/:optionSlug` для сторінок опцій

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
    ADD COLUMN option_id UUID REFERENCES public.property_options(id) ON DELETE CASCADE;
ALTER TABLE public.property_pages
    ALTER COLUMN property_id DROP NOT NULL;
```

### Зміни в product_property_values
```sql
ALTER TABLE public.product_property_values 
    ADD COLUMN option_id UUID REFERENCES public.property_options(id) ON DELETE SET NULL;
```

---

## Файли, що були змінені/створені

### Нові файли:
- ✅ `src/pages/admin/PropertyOptions.tsx` - управління опціями властивості
- ✅ `src/pages/admin/PropertyPageEdit.tsx` - редагування сторінки опції
- ✅ `src/pages/PropertyPage.tsx` - публічна сторінка опції

### Оновлені файли:
- ✅ `src/pages/admin/SectionProperties.tsx` - додано кнопку "Опції"
- ✅ `src/components/admin/ProductPropertyValues.tsx` - працює з option_id
- ✅ `src/components/catalog/FilterSidebar.tsx` - завантажує property_options
- ✅ `src/App.tsx` - нові маршрути

---

## Міграція існуючих даних

Якщо в базі вже є товари з текстовими значеннями властивостей:
1. Створити опції на основі унікальних значень
2. Оновити product_property_values.option_id відповідно до створених опцій
3. Очистити застарілі текстові значення (опціонально)

**Примітка:** Код написаний з fallback на legacy options, тому існуючі дані продовжать працювати без міграції.

---

## Наступні кроки (опціонально)

- [ ] Видалити property_id з property_pages після повної міграції
- [ ] Додати drag-and-drop для сортування опцій
- [ ] Додати масовий імпорт опцій з CSV
- [ ] Додати лічильник товарів біля кожної опції у фільтрах
