
# План: Інтеграція управління залишками по точках самовивозу (складах)

## Огляд

Повна переробка системи обліку залишків товарів: замість простого поля `stock_quantity` та прапорця `is_in_stock` у товарах/модифікаціях, залишки будуть зберігатись по кожній точці самовивозу (складу) окремо.

## Концепція

```text
БУЛО:
  product_modifications.stock_quantity = 10
  product_modifications.is_in_stock = true

СТАНЕ:
  stock_by_pickup_point:
    - modification_id, pickup_point_id = "Склад Київ", quantity = 7
    - modification_id, pickup_point_id = "Склад Львів", quantity = 3

  Загальний залишок = 10 (сума)
  Статус наявності = обчислюється автоматично або вручну ("під замовлення")
```

## Ключові вимоги (з відповідей користувача)

1. **Налаштування системи**: Галочка "Зменшувати залишок при оформленні замовлення"
2. **Відображення залишків**: По кожній точці окремо; загальна кількість у списках/фільтрах
3. **Статус наявності**: Enum з трьома значеннями: `in_stock`, `out_of_stock`, `on_order`
4. **Fallback для однієї точки**: Спрощений інтерфейс без деталізації, якщо склад один
5. **Системна точка**: Завжди є мінімум одна точка (системна), яку не можна видалити
6. **Фільтри**: Враховувати наявність модифікацій при фільтрації

---

## Частина 1: Зміни в базі даних

### 1.1. Нова таблиця `system_settings`
```sql
CREATE TABLE system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(100) UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}',
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Початкове налаштування
INSERT INTO system_settings (key, value, description)
VALUES ('stock_management', '{"decrease_on_order": false}', 
        'Налаштування управління залишками');
```

### 1.2. Нова таблиця `stock_by_pickup_point`
```sql
CREATE TABLE stock_by_pickup_point (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_point_id uuid NOT NULL REFERENCES pickup_points(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  modification_id uuid REFERENCES product_modifications(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Один запис на комбінацію точка + товар/модифікація
  UNIQUE (pickup_point_id, product_id, modification_id),
  
  -- Або товар, або модифікація (не обидва)
  CHECK (
    (product_id IS NOT NULL AND modification_id IS NULL) OR
    (product_id IS NULL AND modification_id IS NOT NULL)
  )
);
```

### 1.3. Новий тип enum для статусу наявності
```sql
CREATE TYPE stock_status AS ENUM ('in_stock', 'out_of_stock', 'on_order');
```

### 1.4. Зміни в таблиці `products`
```sql
-- Замінити is_in_stock (boolean) на stock_status (enum)
ALTER TABLE products 
  ADD COLUMN stock_status stock_status DEFAULT 'in_stock';

-- Міграція існуючих даних
UPDATE products SET stock_status = CASE 
  WHEN is_in_stock = true THEN 'in_stock'::stock_status
  ELSE 'out_of_stock'::stock_status
END;

-- Видалити старі поля (пізніше, після міграції UI)
ALTER TABLE products DROP COLUMN is_in_stock;
ALTER TABLE products DROP COLUMN stock_quantity;
```

### 1.5. Зміни в таблиці `product_modifications`
```sql
ALTER TABLE product_modifications 
  ADD COLUMN stock_status stock_status DEFAULT 'in_stock';

UPDATE product_modifications SET stock_status = CASE 
  WHEN is_in_stock = true THEN 'in_stock'::stock_status
  ELSE 'out_of_stock'::stock_status
END;

ALTER TABLE product_modifications DROP COLUMN is_in_stock;
ALTER TABLE product_modifications DROP COLUMN stock_quantity;
```

### 1.6. Зміни в таблиці `pickup_points`
```sql
-- Додати прапорець системної точки
ALTER TABLE pickup_points 
  ADD COLUMN is_system boolean DEFAULT false;

-- Створити системну точку, якщо немає жодної
INSERT INTO pickup_points (name, city, address, method_id, is_system, is_active)
SELECT 'Основний склад', 'Київ', 'Системна точка', 
  (SELECT id FROM shipping_methods WHERE code = 'pickup' LIMIT 1),
  true, true
WHERE NOT EXISTS (SELECT 1 FROM pickup_points);
```

### 1.7. RPC функція для швидкого розрахунку наявності
```sql
CREATE OR REPLACE FUNCTION get_stock_info(p_modification_id uuid DEFAULT NULL, p_product_id uuid DEFAULT NULL)
RETURNS TABLE (
  total_quantity integer,
  is_available boolean,
  stock_status stock_status,
  by_point jsonb
) AS $$
BEGIN
  RETURN QUERY
  WITH stock_data AS (
    SELECT 
      sbpp.pickup_point_id,
      pp.name as point_name,
      sbpp.quantity
    FROM stock_by_pickup_point sbpp
    JOIN pickup_points pp ON pp.id = sbpp.pickup_point_id AND pp.is_active = true
    WHERE 
      (p_modification_id IS NOT NULL AND sbpp.modification_id = p_modification_id)
      OR (p_product_id IS NOT NULL AND sbpp.product_id = p_product_id)
  ),
  aggregated AS (
    SELECT 
      COALESCE(SUM(quantity), 0)::integer as total_qty,
      jsonb_agg(jsonb_build_object(
        'point_id', pickup_point_id,
        'point_name', point_name,
        'quantity', quantity
      )) as points_data
    FROM stock_data
  ),
  status_info AS (
    SELECT 
      CASE 
        WHEN p_modification_id IS NOT NULL THEN 
          (SELECT pm.stock_status FROM product_modifications pm WHERE pm.id = p_modification_id)
        ELSE 
          (SELECT p.stock_status FROM products p WHERE p.id = p_product_id)
      END as current_status
  )
  SELECT 
    a.total_qty,
    (a.total_qty > 0 OR s.current_status = 'on_order') as is_available,
    s.current_status,
    COALESCE(a.points_data, '[]'::jsonb)
  FROM aggregated a, status_info s;
END;
$$ LANGUAGE plpgsql;
```

### 1.8. Тригер для зменшення залишків при замовленні
```sql
CREATE OR REPLACE FUNCTION decrease_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
  should_decrease boolean;
  point_id uuid;
BEGIN
  -- Перевірити налаштування
  SELECT (value->>'decrease_on_order')::boolean INTO should_decrease
  FROM system_settings WHERE key = 'stock_management';
  
  IF NOT should_decrease THEN
    RETURN NEW;
  END IF;
  
  -- Отримати точку самовивозу з замовлення
  SELECT pickup_point_id INTO point_id FROM orders WHERE id = NEW.order_id;
  
  -- Якщо немає конкретної точки, використати першу з залишком
  IF point_id IS NULL THEN
    SELECT sbpp.pickup_point_id INTO point_id
    FROM stock_by_pickup_point sbpp
    WHERE 
      (NEW.modification_id IS NOT NULL AND sbpp.modification_id = NEW.modification_id)
      OR (NEW.product_id IS NOT NULL AND sbpp.product_id = NEW.product_id)
    AND sbpp.quantity > 0
    ORDER BY sbpp.quantity DESC
    LIMIT 1;
  END IF;
  
  IF point_id IS NOT NULL THEN
    UPDATE stock_by_pickup_point
    SET quantity = GREATEST(0, quantity - NEW.quantity),
        updated_at = now()
    WHERE pickup_point_id = point_id
    AND (
      (NEW.modification_id IS NOT NULL AND modification_id = NEW.modification_id)
      OR (NEW.product_id IS NOT NULL AND product_id = NEW.product_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_decrease_stock_on_order_item
AFTER INSERT ON order_items
FOR EACH ROW EXECUTE FUNCTION decrease_stock_on_order();
```

---

## Частина 2: Зміни в UI (Адмін-панель)

### 2.1. Сторінка налаштувань системи
Новий файл: `src/pages/admin/Settings.tsx`
- Галочка "Зменшувати залишок при оформленні замовлення"
- Додати пункт меню "Налаштування" в AdminSidebar

### 2.2. Редагування точки самовивозу
Оновити `src/pages/admin/PickupPointEdit.tsx`:
- Показати прапорець `is_system` (тільки для перегляду)
- Заборонити видалення системної точки

### 2.3. Список точок самовивозу
Оновити `src/pages/admin/PickupPoints.tsx`:
- Показати бейдж "Системна" для системної точки
- Сховати кнопку видалення для системної точки

### 2.4. Компонент управління залишками
Новий файл: `src/components/admin/StockByPointManager.tsx`
- Таблиця з точками та їх залишками
- Можливість редагувати кількість для кожної точки
- Fallback: якщо тільки одна точка - показати просте поле кількості

### 2.5. Редагування товару
Оновити `src/pages/admin/ProductEdit.tsx`:
- Замінити `is_in_stock` (Switch) на Select зі статусами: "В наявності", "Немає в наявності", "Під замовлення"
- Для простих товарів: додати `StockByPointManager`

### 2.6. Редагування модифікацій
Оновити `src/components/admin/ProductModifications.tsx`:
- Замінити Switch на Select статусів
- Додати `StockByPointManager` для кожної модифікації

### 2.7. SimpleProductFields
Оновити `src/components/admin/SimpleProductFields.tsx`:
- Замінити Switch + Input stock_quantity на новий компонент
- Select для статусу + StockByPointManager

---

## Частина 3: Зміни в публічній частині

### 3.1. Компонент відображення залишків
Новий файл: `src/components/catalog/StockDisplay.tsx`
- Якщо одна точка: "В наявності: X шт" або "Немає в наявності"
- Якщо кілька точок: таблиця/список по точках
- Спеціальний бейдж для статусу "Під замовлення"

### 3.2. Картка товару
Оновити `src/components/catalog/ProductCard.tsx`:
- Додати бейдж "Під замовлення" (жовтий/помаранчевий)
- Логіка: stock_status === 'on_order'

### 3.3. Детальна сторінка товару
Оновити `src/pages/ProductDetail.tsx`:
- Замінити простий текст "В наявності" на компонент `StockDisplay`
- Оновлювати при зміні модифікації
- Дозволити додавання в кошик для "Під замовлення" навіть без залишків

### 3.4. Селектор модифікацій
Оновити `src/components/catalog/ModificationSelector.tsx`:
- Показувати залишок для кожної модифікації
- Бейдж "Під замовлення" де потрібно

### 3.5. Оформлення замовлення
Оновити `src/pages/Checkout.tsx`:
- Дозволяти замовлення товарів зі статусом "Під замовлення"

---

## Частина 4: Фільтри каталогу

### 4.1. FilterSidebar
Оновити `src/components/catalog/FilterSidebar.tsx`:
- Додати чекбокс "Тільки в наявності" (опціонально)
- Логіка: фільтрувати товари де є модифікації з залишком > 0 АБО статус = 'on_order'

### 4.2. Сторінка каталогу
Оновити логіку фільтрації в `src/pages/CatalogSection.tsx`:
- При фільтрації по властивостях враховувати наявність відфільтрованих модифікацій

---

## Частина 5: Хуки та утиліти

### 5.1. Хук для роботи із залишками
Новий файл: `src/hooks/useStock.ts`
```typescript
function useStock(productId?: string, modificationId?: string) {
  // Виклик RPC get_stock_info
  // Повертає { totalQuantity, isAvailable, stockStatus, byPoint }
}
```

### 5.2. Хук для кількості точок
Новий файл: `src/hooks/usePickupPointsCount.ts`
```typescript
function usePickupPointsCount() {
  // Повертає кількість активних точок
  // Використовується для визначення режиму відображення (спрощений/детальний)
}
```

---

## Послідовність реалізації

1. **Міграція БД**: Створити нові таблиці, enum, RPC функції
2. **Типи TypeScript**: Оновити типи для нових структур
3. **Хуки**: useStock, usePickupPointsCount
4. **Адмін UI**: Settings, StockByPointManager, оновити форми товарів
5. **Публічний UI**: StockDisplay, оновити картки та детальні сторінки
6. **Фільтри**: Оновити логіку фільтрації
7. **Checkout**: Логіка зменшення залишків
8. **Тестування**: Перевірити всі сценарії

---

## Технічні деталі

### Нова структура даних

```typescript
// Статус наявності
type StockStatus = 'in_stock' | 'out_of_stock' | 'on_order';

// Залишок по точці
interface StockByPoint {
  pointId: string;
  pointName: string;
  quantity: number;
}

// Інформація про залишки
interface StockInfo {
  totalQuantity: number;
  isAvailable: boolean;
  stockStatus: StockStatus;
  byPoint: StockByPoint[];
}

// Налаштування системи
interface SystemSettings {
  stockManagement: {
    decreaseOnOrder: boolean;
  };
}
```

### Логіка визначення наявності

```typescript
function isProductAvailable(stockInfo: StockInfo): boolean {
  // Якщо статус "під замовлення" - завжди доступний
  if (stockInfo.stockStatus === 'on_order') return true;
  
  // Якщо статус "в наявності" - перевірити реальний залишок
  if (stockInfo.stockStatus === 'in_stock') {
    return stockInfo.totalQuantity > 0;
  }
  
  // Статус "немає в наявності" - недоступний
  return false;
}
```

### Fallback для однієї точки

```typescript
function shouldShowSimplifiedView(pointsCount: number): boolean {
  return pointsCount <= 1;
}

// В компоненті:
if (shouldShowSimplifiedView(pickupPointsCount)) {
  return <SimplifiedStockInput value={totalQuantity} onChange={...} />;
} else {
  return <StockByPointManager byPoint={stockByPoint} onChange={...} />;
}
```

---

## Результат

- Повноцінний облік залишків по складах (точках самовивозу)
- Три статуси наявності: в наявності, немає, під замовлення
- Автоматичне або ручне управління залишками при замовленні
- Спрощений інтерфейс для магазинів з одним складом
- Коректна фільтрація по наявності з урахуванням модифікацій
