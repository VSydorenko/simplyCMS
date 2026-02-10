
# План: Система видів цін з повним видаленням старого механізму

## Огляд

Створення системи множинних видів цін з окремим довідником та таблицею цін, з **повним видаленням** старого механізму (поля `price`, `old_price` в таблицях `products` та `product_modifications`, а також поле `price_multiplier` в `user_categories`).

## Етап 1: База даних

### 1.1 Створити таблицю `price_types`

| Колонка | Тип | Опис |
|---------|-----|------|
| id | uuid PK | |
| name | text NOT NULL | "Роздрібна", "Оптова" |
| code | varchar UNIQUE NOT NULL | "retail", "wholesale" |
| is_default | boolean DEFAULT false | Тільки один |
| sort_order | integer DEFAULT 0 | |
| created_at | timestamptz | |

- Partial unique index на `is_default WHERE is_default = true`
- RLS: SELECT для всіх, ALL для адмінів
- Вставити початковий запис: "Роздрібна" (code: retail, is_default: true)

### 1.2 Створити таблицю `product_prices`

| Колонка | Тип | Опис |
|---------|-----|------|
| id | uuid PK | |
| price_type_id | uuid FK -> price_types NOT NULL | |
| product_id | uuid FK -> products NOT NULL | |
| modification_id | uuid FK -> product_modifications (nullable) | null = простий товар |
| price | numeric NOT NULL | |
| old_price | numeric (nullable) | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

- Unique index на `(price_type_id, product_id, modification_id)` з COALESCE для null
- RLS: SELECT для всіх, ALL для адмінів
- ON DELETE CASCADE для FK

### 1.3 Додати `price_type_id` до `user_categories`

```text
ALTER TABLE user_categories ADD COLUMN price_type_id uuid REFERENCES price_types(id) ON DELETE SET NULL;
```

### 1.4 Міграція існуючих даних

- Скопіювати поточні `products.price` / `products.old_price` в `product_prices` для дефолтного виду ціни (де price IS NOT NULL)
- Скопіювати поточні `product_modifications.price` / `product_modifications.old_price` в `product_prices`

### 1.5 Видалити старі колонки (окремий крок!)

```text
ALTER TABLE products DROP COLUMN price;
ALTER TABLE products DROP COLUMN old_price;
ALTER TABLE product_modifications DROP COLUMN price;
ALTER TABLE product_modifications DROP COLUMN old_price;
ALTER TABLE user_categories DROP COLUMN price_multiplier;
```

---

## Етап 2: Контроль повного видалення старого механізму

Після міграції БД -- окремий крок перевірки та заміни всіх згадок старого механізму у коді. Повний перелік файлів та точок зміни:

### 2.1 Адмін-панель -- видалити/замінити

| Файл | Що видалити/замінити |
|------|---------------------|
| `src/components/admin/SimpleProductFields.tsx` | Видалити поля `price`, `old_price` та відповідні props. Замінити на компонент `ProductPricesEditor` (таблиця цін по видам) |
| `src/components/admin/ProductModifications.tsx` | Видалити поля `price`, `old_price` з форми створення/редагування модифікації. Додати `ProductPricesEditor` для кожної модифікації |
| `src/pages/admin/ProductEdit.tsx` | Видалити `formData.price`, `formData.old_price`, `onPriceChange`, `onOldPriceChange` з стану та обробників. Видалити передачу price/old_price до `SimpleProductFields` та при збереженні |
| `src/pages/admin/UserCategoryEdit.tsx` | Видалити поле `price_multiplier` зі схеми, форми та збереження. Додати Select для вибору виду ціни (`price_type_id`) |
| `src/pages/admin/UserCategories.tsx` | Видалити відображення `price_multiplier`. Замінити на назву виду ціни |
| `src/pages/admin/UserEdit.tsx` | Видалити `price_multiplier` з select-запиту та відображення |
| `src/components/admin/AddProductToOrder.tsx` | Замінити читання `product.price` та `modification.price` на запит з `product_prices` |

### 2.2 Фронтенд (публічна частина) -- видалити/замінити

| Файл | Що видалити/замінити |
|------|---------------------|
| `src/components/catalog/ProductCard.tsx` | Замінити `product.price`, `product.old_price`, `modification.price`, `modification.old_price` на ціну з нового хука/контексту |
| `src/pages/Catalog.tsx` | Видалити `price`, `old_price` з select-запиту модифікацій. Підключити `useProductPrices` |
| `src/pages/ProductDetail.tsx` | Замінити `selectedMod?.price`, `product.price` на ціну з `product_prices` |
| `src/components/catalog/ModificationSelector.tsx` | Видалити `price`, `old_price` з інтерфейсу модифікації та відображення. Приймати ціни через props від нового механізму |
| `src/hooks/useProductsWithStock.ts` | Видалити `price`, `old_price` з інтерфейсу `ProductModification` |
| `src/lib/themes/types.ts` | Видалити `price`, `old_price` з типу `ProductCardProps` (замінити на прийом ціни ззовні) |

### 2.3 Кошик та замовлення -- оновити

| Файл | Що змінити |
|------|-----------|
| `src/hooks/useCart.tsx` | Ціна вже зберігається як `item.price` -- залишається як є (фіксується на момент додавання). Без змін |
| `src/components/cart/CartItem.tsx` | Без змін (працює з `item.price` з кошика) |
| `src/components/checkout/CheckoutOrderSummary.tsx` | Без змін |
| `src/pages/Checkout.tsx` | Без змін (ціна береться з кошика) |
| `src/pages/OrderSuccess.tsx` | Без змін (дані з order_items) |
| `src/pages/ProfileOrderDetail.tsx` | Без змін (дані з order_items) |
| `src/pages/admin/OrderDetail.tsx` | Замінити `item.price` при додаванні нового товару -- брати з `product_prices` |

### 2.4 Тема (default) -- оновити

| Файл | Що змінити |
|------|-----------|
| `src/themes/default/index.tsx` | Оновити реекспорти, якщо змінились props компонентів |

---

## Етап 3: Нові компоненти та хуки

### 3.1 Адмін-панель

**Новий розділ "Види цін"**:
- `src/pages/admin/PriceTypes.tsx` -- список видів цін (CRUD)
- `src/pages/admin/PriceTypeEdit.tsx` -- форма створення/редагування виду ціни
- Додати пункт в `AdminSidebar.tsx`
- Додати роути в `App.tsx`

**Компонент `ProductPricesEditor`**:
- `src/components/admin/ProductPricesEditor.tsx` -- таблиця з рядком на кожен вид ціни, в кожному рядку поля `price` та `old_price`
- Props: `productId`, `modificationId` (nullable)
- Завантажує всі `price_types`, показує поточні ціни з `product_prices`
- Зберігає upsert в `product_prices`

### 3.2 Фронтенд

**Хук `usePriceType`**:
- Визначає `price_type_id` для поточного користувача
- Ланцюжок: user -> profile.category_id -> user_categories.price_type_id -> fallback to is_default
- Для гостя: одразу дефолтний

**Хук `useProductPrices`**:
- Приймає масив `productId[]` та `priceTypeId`
- Завантажує ціни з `product_prices`
- Повертає `Map<string, { price, old_price }>` (ключ = productId або modificationId)
- Якщо немає ціни для виду -- фолбек на дефолтний вид

---

## Етап 4: Інтеграція

### 4.1 Каталог
- `Catalog.tsx`: після завантаження товарів, запитати ціни через `useProductPrices` для всіх productId
- `ProductCard.tsx`: отримувати ціну як prop або з контексту
- Фільтри по ціні: діапазон розраховувати на основі цін активного виду

### 4.2 Сторінка товару
- `ProductDetail.tsx`: завантажити ціни для всіх модифікацій + для самого товару
- При перемиканні модифікації -- показувати ціну з `product_prices`
- Кнопка "Додати в кошик" -- передає ціну з `product_prices`

### 4.3 Адмін -- додавання товару в замовлення
- `AddProductToOrder.tsx`: при виборі товару завантажувати ціну з `product_prices` (дефолтний вид)

---

## Порядок виконання

1. **Крок 1**: Міграція БД -- створити `price_types`, `product_prices`, додати `price_type_id` до `user_categories`, мігрувати дані
2. **Крок 2**: Міграція БД -- видалити колонки `price`/`old_price` з `products` та `product_modifications`, видалити `price_multiplier` з `user_categories`
3. **Крок 3**: Створити адмін CRUD для видів цін (`PriceTypes.tsx`, `PriceTypeEdit.tsx`)
4. **Крок 4**: Створити `ProductPricesEditor.tsx` та інтегрувати в `ProductEdit`, `SimpleProductFields`, `ProductModifications`
5. **Крок 5**: Додати вибір виду ціни в `UserCategoryEdit.tsx`, оновити `UserCategories.tsx`
6. **Крок 6**: Створити хуки `usePriceType`, `useProductPrices`
7. **Крок 7**: Оновити фронтенд: Catalog, ProductCard, ProductDetail, ModificationSelector, фільтри
8. **Крок 8**: Оновити адмін OrderDetail та AddProductToOrder
9. **Крок 9**: Контрольна перевірка -- пошук по всьому коду залишків `\.price`, `old_price`, `price_multiplier` для гарантії повного видалення
