

# Система скидок (Discounts Module)

## Концепція

Модуль скидок з деревовидною структурою груп, де логіка застосування визначається оператором групи (AND/OR/NOT/MIN/MAX). Кожна скидка прив'язана до виду ціни та може мати складні умови. Система розширювана через плагіни (хуки).

## Архітектура груп та скидок

Структура -- дерево з групами-операторами та скидками-листками:

```text
[Група "AND"]                  <- всі дочірні мають виконатись
  ├── Скидка: -10% на розділ "Техніка"
  ├── Скидка: -5% для VIP користувачів
  └── [Група "MIN"]            <- обирається мінімальна знижка з дочірніх
        ├── Скидка: -15% акційна
        └── Скидка: -20% за кількість

Результат: (-10% + -5%) + min(-15%, -20%) = -15% + -15% = -30%
```

Оператори груп:
- **AND** (та): всі скидки в групі сумуються (складаються)
- **OR** (або): застосовується перша підходяща скидка за пріоритетом
- **NOT** (не): інвертує умову -- скидка НЕ застосовується, якщо умови виконані
- **MIN** (мінімум): обирається найменша скидка серед підходящих
- **MAX** (максимум): обирається найбільша скидка серед підходящих

---

## Етап 1: База даних

### 1.1 Таблиця `discount_groups`

| Колонка | Тип | Опис |
|---------|-----|------|
| id | uuid PK | |
| name | text NOT NULL | Назва групи |
| description | text | Опис |
| operator | varchar NOT NULL | 'and', 'or', 'not', 'min', 'max' |
| parent_group_id | uuid FK self (nullable) | Батьківська група (null = кореневий рівень) |
| price_type_id | uuid FK -> price_types NOT NULL | Вид ціни, до якого застосовується |
| is_active | boolean DEFAULT true | |
| priority | integer DEFAULT 0 | Порядок серед сусідніх груп |
| starts_at | timestamptz (nullable) | Дата початку дії |
| ends_at | timestamptz (nullable) | Дата закінчення дії |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: SELECT для всіх, ALL для адмінів.

### 1.2 Таблиця `discounts`

| Колонка | Тип | Опис |
|---------|-----|------|
| id | uuid PK | |
| name | text NOT NULL | Назва скидки |
| description | text | Опис |
| group_id | uuid FK -> discount_groups NOT NULL | До якої групи належить |
| discount_type | varchar NOT NULL | 'percent', 'fixed_amount', 'fixed_price' |
| discount_value | numeric NOT NULL | Значення (%, сума знижки, або фінальна ціна) |
| priority | integer DEFAULT 0 | Порядок всередині групи |
| is_active | boolean DEFAULT true | |
| starts_at | timestamptz (nullable) | Індивідуальні часові обмеження |
| ends_at | timestamptz (nullable) | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

Типи знижок:
- `percent` -- відсоток від базової ціни (value = 10 означає -10%)
- `fixed_amount` -- фіксована сума знижки (value = 50 означає -50 грн)
- `fixed_price` -- фінальна ціна (value = 999 означає ціна = 999 грн)

### 1.3 Таблиця `discount_targets` (до чого застосовується)

| Колонка | Тип | Опис |
|---------|-----|------|
| id | uuid PK | |
| discount_id | uuid FK -> discounts NOT NULL | |
| target_type | varchar NOT NULL | 'product', 'modification', 'section', 'all' |
| target_id | uuid (nullable) | ID товару/модифікації/розділу (null для 'all') |
| created_at | timestamptz | |

### 1.4 Таблиця `discount_conditions` (умови застосування)

| Колонка | Тип | Опис |
|---------|-----|------|
| id | uuid PK | |
| discount_id | uuid FK -> discounts NOT NULL | |
| condition_type | varchar NOT NULL | 'user_category', 'min_quantity', 'min_order_amount', 'user_logged_in' |
| operator | varchar NOT NULL | '=', '>=', '>', '<=', '<', 'in', 'not_in' |
| value | jsonb NOT NULL | Значення умови |
| created_at | timestamptz | |

Приклади conditions:
- `{ condition_type: 'user_category', operator: 'in', value: ["uuid1", "uuid2"] }` -- для VIP та Опт
- `{ condition_type: 'min_quantity', operator: '>=', value: 5 }` -- від 5 одиниць
- `{ condition_type: 'min_order_amount', operator: '>=', value: 1000 }` -- від 1000 грн
- `{ condition_type: 'user_logged_in', operator: '=', value: true }` -- тільки авторизованим

### 1.5 Зміни в `order_items`

Додати колонки для фіксації деталей скидки:

| Колонка | Тип | Опис |
|---------|-----|------|
| discount_data | jsonb (nullable) | `{ discount_id, discount_name, discount_type, discount_value, base_price, final_price, group_name }` |
| base_price | numeric (nullable) | Ціна до знижки (price залишається як фінальна) |

---

## Етап 2: Бекенд-логіка обчислення

### 2.1 Хук `useDiscountedPrice`

Алгоритм обчислення:

```text
1. Завантажити всі активні discount_groups для поточного price_type_id
   (з фільтром за датою: starts_at <= now <= ends_at або null)
2. Для кожної кореневої групи рекурсивно обчислити:
   a. Отримати всі discounts в групі
   b. Для кожної скидки перевірити:
      - чи targets включає поточний товар/модифікацію/розділ
      - чи виконуються всі conditions
   c. Обчислити знижку (% від бази, фіксована сума, фіксована ціна)
   d. Застосувати оператор групи:
      - AND: сумувати всі підходящі знижки
      - OR: взяти першу підходящу за пріоритетом
      - NOT: інвертувати (якщо умови виконані -- скидка НЕ діє)
      - MIN: взяти мінімальну знижку
      - MAX: взяти максимальну знижку
   e. Якщо є дочірні групи -- рекурсивно обчислити їх та включити результат
3. Фінальна ціна = base_price - total_discount (мінімум 0)
```

### 2.2 Утиліта `resolveDiscount` (src/lib/discountEngine.ts)

Чиста функція без залежностей від React:

```text
Input:
  - basePrice: number
  - discountGroups: DiscountGroup[] (з вкладеними discounts, targets, conditions)
  - context: { userId?, userCategoryId?, quantity, cartTotal, productId, modificationId?, sectionId? }

Output:
  - finalPrice: number
  - totalDiscount: number
  - appliedDiscounts: Array<{ id, name, type, value, calculatedAmount }>
  - rejectedDiscounts: Array<{ id, name, reason: string }> -- для валідатора!
```

---

## Етап 3: Адмін-панель

### 3.1 Розділ "Скидки" (`/admin/discounts`)

- Деревовидне відображення груп та скидок
- CRUD для груп (назва, оператор, вид ціни, батьківська група, дати, активність)
- CRUD для скидок всередині групи (тип, значення, пріоритет, дати)
- Вкладка "Цілі" -- вибір товарів/модифікацій/розділів через Select з пошуком
- Вкладка "Умови" -- конструктор умов (аналогічно до category_rules)

Сторінки:
- `src/pages/admin/Discounts.tsx` -- дерево груп з вкладеними скидками
- `src/pages/admin/DiscountGroupEdit.tsx` -- створення/редагування групи
- `src/pages/admin/DiscountEdit.tsx` -- створення/редагування скидки (з targets та conditions)

### 3.2 Валідатор цін (`/admin/price-validator`)

Окрема сторінка в адмін-панелі для діагностики ціноутворення:

**Фільтри:**
- Вибір користувача (з автокомплітом або "Гість")
- Вибір товару (з автокомплітом)
- Вибір модифікації (якщо є)
- Кількість товару
- Сума кошика

**Результат показує повний ланцюжок:**

```text
1. Вид ціни: "Оптова" (з категорії користувача "VIP")
   Причина: profiles.category_id -> user_categories.price_type_id

2. Базова ціна: 1000 грн
   Джерело: product_prices (price_type: "Оптова", product: "Товар X")

3. Знайдені скидки (3):
   [Застосовано] -10% "Літній розпродаж" -- targets: розділ "Техніка", conditions: всі виконані
   [Застосовано] -5% "VIP знижка" -- targets: all, conditions: user_category = "VIP"
   [Відхилено] -20% "За кількість від 10" -- conditions: min_quantity >= 10, поточна кількість: 3

4. Обчислення:
   Група "Основна" (AND): -10% + -5% = -15%
   1000 - 150 = 850 грн

5. Фінальна ціна: 850 грн (знижка: 150 грн, -15%)
```

---

## Етап 4: Фронтенд-інтеграція

### 4.1 Каталог та картка товару

- В `resolvePrice` додати другий етап: після отримання базової ціни -- обчислити знижку
- `ProductCard` показує перекреслену базову ціну + ціну зі знижкою + бейдж "-10%"
- `ProductDetail` -- аналогічно, з деталями знижки

### 4.2 Кошик

- При додаванні товару обчислювати ціну зі знижкою (з урахуванням кількості та суми)
- При зміні кількості -- перераховувати знижку (умови по кількості/сумі можуть змінитись)

### 4.3 Оформлення замовлення

- Фіксувати в `order_items.discount_data` деталі знижки
- `order_items.base_price` = ціна до знижки
- `order_items.price` = фінальна ціна після знижки

---

## Етап 5: Хуки для розширень (Plugin Hooks)

Нові хуки для системи плагінів:

| Хук | Коли | Контекст |
|-----|------|----------|
| `discount.conditions.evaluate` | При перевірці умов | { discount, user, product, context } |
| `discount.before_apply` | Перед застосуванням | { discount, basePrice, context } |
| `discount.after_apply` | Після застосування | { discount, finalPrice, context } |
| `discount.types` | Реєстрація нових типів | { registeredTypes } |
| `admin.discount.form.fields` | Додаткові поля у формі | { discount } |

Це дозволить пізніше додати промокоди як плагін (реєструє новий condition_type 'promo_code', додає UI поле введення коду в checkout через хук).

---

## Порядок виконання (покроково)

1. **Крок 1**: Міграція БД -- створити всі 4 таблиці + зміни в order_items + RLS
2. **Крок 2**: Створити `discountEngine.ts` -- чиста логіка обчислення з підтримкою дерева груп
3. **Крок 3**: Створити адмін CRUD для груп скидок (`Discounts.tsx`, `DiscountGroupEdit.tsx`)
4. **Крок 4**: Створити адмін CRUD для скидок (`DiscountEdit.tsx` з targets та conditions)
5. **Крок 5**: Створити валідатор цін (`/admin/price-validator`)
6. **Крок 6**: Створити хук `useDiscountedPrice` та інтегрувати в каталог, картку, кошик
7. **Крок 7**: Оновити Checkout для фіксації discount_data в order_items
8. **Крок 8**: Додати хуки для плагінів

## Технічні примітки

- Всі ціни обчислюються динамічно (% від базової ціни з product_prices)
- `fixed_price` має найвищий пріоритет -- якщо задана фіксована ціна, вона перекриває % знижки
- При конфлікті `fixed_price` з іншими скидками в групі AND -- `fixed_price` виграє (не сумується)
- Часові обмеження перевіряються як на рівні групи, так і на рівні окремої скидки
- NOT-група: якщо умови знижки в NOT-групі виконуються, знижка НЕ застосовується (інверсія)
- Для Google/Facebook фідів фінальна ціна обчислюється тим же движком через edge function
- Промокоди не реалізуються зараз, але архітектура готова (condition_type: 'promo_code')

