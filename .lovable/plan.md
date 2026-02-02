
# Система розширень (Plugin System) для CMS

## Огляд концепції

Система розширень дозволить додавати нову функціональність без модифікації основного коду. Розширення зможуть:
- Додавати нові сторінки в адмін-панель
- Розширювати існуючі форми новими полями
- Додавати нові типи віджетів на сайт
- Створювати власні таблиці в базі даних
- Додавати серверну логіку через Edge Functions

---

## Архітектура системи

### 1. Реєстр розширень (Plugin Registry)

Центральна таблиця в базі даних для відстеження встановлених розширень:

```
plugins (таблиця)
├── id: uuid
├── name: string (унікальна назва, напр. "seo-module")
├── display_name: string ("SEO Модуль")
├── version: string ("1.0.0")
├── is_active: boolean
├── config: jsonb (налаштування плагіна)
├── hooks: jsonb (зареєстровані hooks)
├── migrations_applied: jsonb (виконані міграції)
├── installed_at: timestamp
└── updated_at: timestamp
```

### 2. Система хуків (Hooks System)

Визначені точки розширення в коді:

**Frontend Hooks (React):**
- `admin.sidebar.items` - додавання пунктів меню
- `admin.dashboard.widgets` - віджети на дашборді
- `product.form.fields` - додаткові поля товару
- `product.card.badges` - бейджі на картці товару
- `checkout.steps` - кроки оформлення замовлення
- `order.actions` - дії над замовленням

**Backend Hooks (Edge Functions):**
- `order.created` - після створення замовлення
- `order.status_changed` - зміна статусу
- `product.before_save` - перед збереженням товару
- `user.registered` - реєстрація користувача

### 3. Структура розширення

Кожне розширення - окрема папка:

```
src/plugins/
├── seo-module/
│   ├── manifest.json          # Метадані плагіна
│   ├── index.ts               # Точка входу
│   ├── components/            # React компоненти
│   │   ├── SeoFields.tsx
│   │   └── SeoSidebar.tsx
│   ├── hooks/                 # Реєстрація хуків
│   │   └── register.ts
│   └── migrations/            # SQL міграції
│       └── 001_create_seo_metadata.sql
│
├── nova-poshta/
│   ├── manifest.json
│   ├── index.ts
│   ├── components/
│   │   └── DeliverySelector.tsx
│   ├── hooks/
│   │   └── register.ts
│   └── edge-functions/
│       └── nova-poshta-api/
│           └── index.ts
│
└── reviews/
    ├── manifest.json
    ├── index.ts
    ├── components/
    │   ├── ReviewForm.tsx
    │   ├── ReviewsList.tsx
    │   └── AdminReviews.tsx
    ├── hooks/
    │   └── register.ts
    └── migrations/
        └── 001_create_reviews_table.sql
```

### 4. Manifest файл

```json
{
  "name": "seo-module",
  "displayName": "SEO Модуль",
  "version": "1.0.0",
  "description": "Розширені SEO можливості для товарів та розділів",
  "author": "Your Company",
  "dependencies": [],
  "hooks": [
    {
      "name": "admin.sidebar.items",
      "priority": 100
    },
    {
      "name": "product.form.fields",
      "priority": 50
    }
  ],
  "migrations": [
    "migrations/001_create_seo_metadata.sql"
  ],
  "settings": {
    "enableOpenGraph": {
      "type": "boolean",
      "default": true,
      "label": "Увімкнути Open Graph теги"
    }
  }
}
```

---

## Технічна реалізація

### Крок 1: Створення інфраструктури хуків

**HookRegistry** - центральний клас для управління хуками:

```typescript
// src/lib/plugins/HookRegistry.ts
class HookRegistry {
  private hooks: Map<string, HookHandler[]>;
  
  register(hookName: string, handler: HookHandler, priority: number);
  execute(hookName: string, context: any): Promise<any>;
  getHandlers(hookName: string): HookHandler[];
}
```

**SlotComponent** - компонент для вставки UI плагінів:

```typescript
// src/components/plugins/Slot.tsx
<PluginSlot name="product.form.fields" context={{ product, form }} />
```

### Крок 2: Таблиці в базі даних

```sql
-- Реєстр плагінів
CREATE TABLE plugins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar UNIQUE NOT NULL,
  display_name text NOT NULL,
  version varchar NOT NULL,
  is_active boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  hooks jsonb DEFAULT '[]',
  migrations_applied jsonb DEFAULT '[]',
  installed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Логи подій для хуків
CREATE TABLE plugin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plugin_name varchar NOT NULL,
  hook_name varchar NOT NULL,
  payload jsonb,
  result jsonb,
  executed_at timestamptz DEFAULT now()
);
```

### Крок 3: Завантажувач плагінів

```typescript
// src/lib/plugins/PluginLoader.ts
export async function loadPlugins() {
  const { data: plugins } = await supabase
    .from('plugins')
    .select('*')
    .eq('is_active', true);
    
  for (const plugin of plugins) {
    const module = await import(`@/plugins/${plugin.name}`);
    module.register(hookRegistry);
  }
}
```

### Крок 4: Адмін-панель для управління плагінами

Нова сторінка `/admin/plugins`:
- Список встановлених плагінів
- Активація/деактивація
- Налаштування кожного плагіна
- Встановлення нових (завантаження архіву)
- Виконання міграцій

---

## Приклад розширення: Модуль відгуків

### manifest.json
```json
{
  "name": "reviews",
  "displayName": "Відгуки та рейтинги",
  "version": "1.0.0",
  "hooks": [
    {"name": "admin.sidebar.items", "priority": 80},
    {"name": "product.detail.after", "priority": 50},
    {"name": "product.card.badges", "priority": 30}
  ]
}
```

### Реєстрація хуків
```typescript
// src/plugins/reviews/hooks/register.ts
export function register(registry: HookRegistry) {
  registry.register('admin.sidebar.items', () => ({
    title: 'Відгуки',
    url: '/admin/reviews',
    icon: Star
  }), 80);
  
  registry.register('product.detail.after', ({ product }) => (
    <ReviewsList productId={product.id} />
  ), 50);
}
```

### Міграція
```sql
-- src/plugins/reviews/migrations/001_create_reviews.sql
CREATE TABLE product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  user_id uuid,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text,
  is_approved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

---

## Процес встановлення розширення

```text
1. Адмін завантажує архів плагіна
         ↓
2. Система розпаковує в src/plugins/{name}/
         ↓
3. Валідація manifest.json
         ↓
4. Запис в таблицю plugins (is_active: false)
         ↓
5. Адмін активує плагін
         ↓
6. Виконання міграцій (якщо є)
         ↓
7. Rebuild проекту (vite)
         ↓
8. Плагін готовий до роботи
```

---

## Обмеження та особливості

### Що можливо:
- Додавання нових сторінок та компонентів
- Розширення існуючих форм через slots
- Створення таблиць в базі даних
- Серверна логіка через Edge Functions
- Налаштування через адмін-панель

### Що потребує rebuild:
- Нові React компоненти
- Зміни в маршрутизації
- Нові TypeScript типи

### Що працює в runtime:
- Зміна конфігурації плагіна
- Активація/деактивація
- Виконання backend хуків

---

## Порядок реалізації

1. **Фаза 1: Інфраструктура**
   - Створення таблиць plugins, plugin_events
   - HookRegistry клас
   - PluginSlot компонент
   - PluginLoader

2. **Фаза 2: Адмін-панель**
   - Сторінка /admin/plugins
   - Список плагінів з активацією
   - Налаштування плагінів
   - Виконання міграцій

3. **Фаза 3: Точки розширення**
   - Додавання PluginSlot в ключові місця UI
   - Документування доступних хуків
   - Типізація контекстів

4. **Фаза 4: Приклад плагіна**
   - Створення модуля відгуків як reference
   - Документація для розробників

---

## Технічні деталі

### Файли для створення:
- `src/lib/plugins/HookRegistry.ts` - реєстр хуків
- `src/lib/plugins/PluginLoader.ts` - завантажувач
- `src/lib/plugins/types.ts` - TypeScript типи
- `src/components/plugins/PluginSlot.tsx` - слот компонент
- `src/pages/admin/Plugins.tsx` - сторінка управління
- `src/pages/admin/PluginSettings.tsx` - налаштування плагіна

### Зміни в існуючих файлах:
- `src/App.tsx` - ініціалізація плагінів
- `src/components/admin/AdminSidebar.tsx` - слот для меню
- `src/pages/admin/ProductEdit.tsx` - слоти для полів
- `src/pages/ProductDetail.tsx` - слоти для контенту

### Таблиці в базі даних:
- `plugins` - реєстр плагінів
- `plugin_events` - логи виконання хуків
- `plugin_settings` - налаштування (опціонально)
