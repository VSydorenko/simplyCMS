

## Огляд завдання

Перейменувати колонку `code` на `slug` у таблиці `section_properties` та оновити всі посилання в коді. Slug буде використовуватися як URL-friendly ідентифікатор для сторінок властивостей.

---

## Зміни в базі даних

Перейменування колонки замість додавання нової:

```sql
ALTER TABLE public.section_properties 
  RENAME COLUMN code TO slug;
```

Це автоматично збереже всі існуючі значення та оновить усі посилання на колонку.

---

## Файли для оновлення

### 1. Адмін-панель

| Файл | Зміни |
|------|-------|
| `src/pages/admin/PropertyEdit.tsx` | Перейменувати `code` на `slug` у формі та стейті |
| `src/pages/admin/Properties.tsx` | Оновити створення властивості та відображення в таблиці |
| `src/components/admin/SectionPropertiesManager.tsx` | Оновити select та відображення slug |
| `src/components/admin/SectionPropertiesTable.tsx` | Оновити заголовок та дані таблиці |

### 2. Каталог та фільтри

| Файл | Зміни |
|------|-------|
| `src/components/catalog/FilterSidebar.tsx` | Використовувати `slug` замість `code` як ключ |
| `src/pages/Catalog.tsx` | Оновити логіку фільтрації |
| `src/pages/CatalogSection.tsx` | Оновити логіку фільтрації |

### 3. Публічні сторінки

| Файл | Зміни |
|------|-------|
| `src/pages/PropertyPage.tsx` | Шукати властивість за `slug` замість `code` |
| `src/pages/ProductDetail.tsx` | Оновити запит для отримання slug |
| `src/components/catalog/ProductCharacteristics.tsx` | Оновити інтерфейс та використання slug |

### 4. Нові файли для системи сторінок властивостей

| Файл | Опис |
|------|------|
| `src/pages/Properties.tsx` | Список властивостей з `has_page=true` |
| `src/pages/PropertyDetail.tsx` | Сторінка властивості зі списком значень |

### 5. Маршрутизація та навігація

| Файл | Зміни |
|------|-------|
| `src/App.tsx` | Нові маршрути `/properties/*`, видалити старий `/:propertyCode/:optionSlug` |
| `src/components/catalog/CatalogLayout.tsx` | Додати посилання "Бренди" або "Властивості" в меню |

---

## Структура URL

```text
/properties                              -> Список властивостей з has_page=true
/properties/torgovaya-marka              -> Сторінка властивості "Торгова марка"  
/properties/torgovaya-marka/huawei       -> Сторінка значення "Huawei"
```

---

## Логіка пошуку товарів на сторінці значення

Розширений пошук для включення товарів з значеннями на рівні модифікацій:

```text
1. Знайти product_id з product_property_values де option_id = обраний
2. Знайти modification_id з modification_property_values де option_id = обраний
3. За modification_id знайти product_id
4. Об'єднати унікальні product_id та завантажити товари
```

---

## Клікабельні характеристики

На сторінці товару у характеристиках:
- Якщо властивість має `has_page = true` та є slug опції
- Рендерити значення як `<Link to="/properties/{propertySlug}/{optionSlug}">`

---

## Послідовність реалізації

1. Міграція бази даних (перейменувати `code` на `slug`)
2. Оновити адмін-панель (PropertyEdit, Properties, SectionPropertiesManager, SectionPropertiesTable)
3. Оновити каталог та фільтри (FilterSidebar, Catalog, CatalogSection)
4. Оновити публічні сторінки (PropertyPage, ProductDetail, ProductCharacteristics)
5. Створити нові сторінки (Properties, PropertyDetail)
6. Оновити маршрутизацію (App.tsx)
7. Додати навігацію (CatalogLayout)

