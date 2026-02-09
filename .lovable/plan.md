
# План системи тем (Themes) для CMS

## Огляд

Реалізація повноцінної системи тем, аналогічної існуючій системі плагінів, яка дозволить:
- Розробляти нові теми з власними компонентами та стилями
- Завантажувати та встановлювати теми через адмін-панель
- Перемикатися між встановленими темами
- Мігрувати поточну тему як дефолтну ("SolarStore Default")

---

## Архітектурна концепція

### Принцип розділення

```text
+---------------------------+      +---------------------------+
|     THEME (Фронтенд)      |      |    CORE (Бекенд/Логіка)   |
+---------------------------+      +---------------------------+
|                           |      |                           |
| - Компоненти сторінок     | <--> | - Запити до Supabase      |
| - Стилі (CSS variables)   |      | - Типи даних              |
| - Layouts (Header/Footer) |      | - Хуки даних              |
| - UI варіації             |      | - Валідація               |
|                           |      | - Бізнес-логіка           |
+---------------------------+      +---------------------------+
```

### Що залишається в Core (не міняється темою)
- Інтеграція з Supabase (client, types)
- Хуки авторизації (useAuth)
- Хуки даних (useCart, useProductsWithStock)
- Система плагінів (HookRegistry, PluginSlot)
- Утиліти (lib/utils.ts, lib/shipping/)
- Адмін-панель (повністю)

### Що визначає Theme
- Публічні сторінки (Index, Catalog, ProductDetail, Cart, Checkout, Profile)
- Layouts (CatalogLayout, ProfileLayout)
- UI-компоненти каталогу (ProductCard, FilterSidebar, ProductGallery)
- Стилі (index.css, CSS variables)
- Картки, секції, бейджі

---

## Структура теми

### Директорія теми

```text
src/themes/
├── default/                    # Дефолтна тема (мігрована)
│   ├── manifest.json           # Метадані теми
│   ├── index.ts                # Точка входу + реєстрація
│   ├── styles/
│   │   └── theme.css           # CSS variables теми
│   ├── layouts/
│   │   ├── MainLayout.tsx      # Публічний layout (header/footer)
│   │   ├── CatalogLayout.tsx   # Layout каталогу
│   │   └── ProfileLayout.tsx   # Layout профілю
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── CatalogPage.tsx
│   │   ├── ProductPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── CheckoutPage.tsx
│   │   └── ProfilePage.tsx
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductGallery.tsx
│   │   ├── FilterSidebar.tsx
│   │   └── ...
│   └── slots/                  # Компоненти для слотів плагінів
│       └── ProductBadges.tsx
│
└── themes.ts                   # Реєстр тем (аналог plugins/index.ts)
```

### Маніфест теми (manifest.json)

```text
{
  "name": "default",
  "displayName": "SolarStore Default",
  "version": "1.0.0",
  "description": "Стандартна тема SolarStore з підтримкою світлої/темної теми",
  "author": "SolarStore Team",
  "previewImage": "/themes/default/preview.png",
  "supports": {
    "darkMode": true,
    "customColors": true,
    "catalogLayouts": ["grid", "list"],
    "productLayouts": ["default"]
  },
  "settings": {
    "primaryColor": {
      "type": "color",
      "default": "#1192DC",
      "label": "Основний колір"
    },
    "showBrandInHeader": {
      "type": "boolean",
      "default": true,
      "label": "Показувати логотип у хедері"
    },
    "productsPerRow": {
      "type": "select",
      "default": "4",
      "label": "Товарів у рядку",
      "options": [
        { "value": "3", "label": "3 товари" },
        { "value": "4", "label": "4 товари" },
        { "value": "5", "label": "5 товарів" }
      ]
    }
  }
}
```

---

## Система завантаження тем

### ThemeRegistry (аналог HookRegistry)

```text
src/lib/themes/
├── types.ts           # Інтерфейси ThemeManifest, ThemeModule
├── ThemeRegistry.ts   # Реєстр та завантаження тем
├── ThemeLoader.ts     # Динамічне завантаження
├── ThemeContext.tsx   # React Context для активної теми
└── index.ts           # Експорти
```

### Інтерфейси

```text
// ThemeManifest
interface ThemeManifest {
  name: string;
  displayName: string;
  version: string;
  description?: string;
  author?: string;
  previewImage?: string;
  supports?: ThemeSupports;
  settings?: Record<string, ThemeSettingDefinition>;
}

// ThemeModule - експортується з кожної теми
interface ThemeModule {
  manifest: ThemeManifest;
  MainLayout: React.ComponentType;
  CatalogLayout: React.ComponentType;
  ProfileLayout: React.ComponentType;
  pages: {
    HomePage: React.ComponentType;
    CatalogPage: React.ComponentType;
    ProductPage: React.ComponentType;
    CartPage: React.ComponentType;
    CheckoutPage: React.ComponentType;
    ProfilePage: React.ComponentType;
    // ...інші сторінки
  };
  components: {
    ProductCard: React.ComponentType<ProductCardProps>;
    FilterSidebar: React.ComponentType<FilterSidebarProps>;
    // ...інші компоненти
  };
  styles: string; // CSS import
}
```

### ThemeContext

```text
interface ThemeContextType {
  activeTheme: ThemeModule | null;
  themeName: string;
  themeSettings: Record<string, unknown>;
  isLoading: boolean;
}

// Використання в App.tsx
<ThemeProvider>
  <ThemeRouter /> {/* Динамічні роути на основі активної теми */}
</ThemeProvider>
```

---

## База даних

### Нова таблиця: themes

```text
CREATE TABLE themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(100) UNIQUE NOT NULL,
  display_name text NOT NULL,
  version varchar(20) NOT NULL,
  description text,
  author text,
  preview_image text,
  is_active boolean DEFAULT false,
  config jsonb DEFAULT '{}',
  settings_schema jsonb DEFAULT '{}',
  installed_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Обмеження: тільки одна тема може бути активною
CREATE UNIQUE INDEX themes_active_idx ON themes (is_active) WHERE is_active = true;

-- RLS policies
ALTER TABLE themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Themes are viewable by everyone"
  ON themes FOR SELECT USING (true);

CREATE POLICY "Themes are manageable by admins"
  ON themes FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

### Системні налаштування

```text
-- Додати до system_settings
INSERT INTO system_settings (key, value, description)
VALUES ('active_theme', '"default"', 'Активна тема сайту');
```

---

## Інтеграція в App.tsx

### Динамічний роутинг

```text
// Замість статичних імпортів сторінок
function ThemeRouter() {
  const { activeTheme, isLoading } = useTheme();
  
  if (isLoading) return <LoadingScreen />;
  if (!activeTheme) return <FallbackTheme />;
  
  const {
    MainLayout,
    CatalogLayout,
    ProfileLayout,
    pages: {
      HomePage,
      CatalogPage,
      ProductPage,
      CartPage,
      CheckoutPage,
      ProfilePage,
    }
  } = activeTheme;
  
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<HomePage />} />
      </Route>
      <Route element={<CatalogLayout />}>
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/catalog/:sectionSlug" element={<CatalogPage />} />
        <Route path="/catalog/:sectionSlug/:productSlug" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
      </Route>
      <Route path="/profile" element={<ProfileLayout />}>
        <Route index element={<ProfilePage />} />
        {/* ... */}
      </Route>
      {/* Admin routes залишаються незмінними */}
    </Routes>
  );
}
```

---

## Адмін-панель: Управління темами

### Нові сторінки

```text
src/pages/admin/
├── Themes.tsx             # Список тем (аналог Plugins.tsx)
└── ThemeSettings.tsx      # Налаштування обраної теми
```

### UI сторінки Themes.tsx

```text
+----------------------------------------------------------+
| ← Теми оформлення                     [Встановити тему]  |
+----------------------------------------------------------+
|                                                          |
| +----------------------+  +----------------------+       |
| | [Preview Image]      |  | [Preview Image]      |       |
| |                      |  |                      |       |
| | SolarStore Default   |  | Minimal Theme        |       |
| | v1.0.0 | SolarStore  |  | v1.0.0 | Community   |       |
| |                      |  |                      |       |
| | [●] Активна          |  | [ ] Активувати       |       |
| | [Налаштування]       |  | [Налаштування] [🗑]  |       |
| +----------------------+  +----------------------+       |
|                                                          |
+----------------------------------------------------------+
```

### Функції
- Перегляд встановлених тем
- Активація/деактивація теми (одна активна)
- Налаштування теми (кольори, опції)
- Встановлення нової теми
- Видалення теми (крім активної та дефолтної)

---

## Міграція поточного коду

### Етап 1: Створення інфраструктури
1. Створити `src/lib/themes/` з типами та реєстром
2. Створити таблицю `themes` в БД
3. Створити ThemeContext та ThemeProvider

### Етап 2: Міграція дефолтної теми
1. Створити `src/themes/default/`
2. Перенести компоненти:
   - `src/components/catalog/*` → `src/themes/default/components/`
   - `src/components/profile/ProfileLayout.tsx` → `src/themes/default/layouts/`
   - `src/pages/Index.tsx` → `src/themes/default/pages/HomePage.tsx`
   - `src/pages/Catalog.tsx` → `src/themes/default/pages/CatalogPage.tsx`
   - і т.д.
3. Створити manifest.json та index.ts
4. Оновити імпорти в App.tsx

### Етап 3: Адмін-панель
1. Додати пункт "Теми" в AdminSidebar
2. Створити Themes.tsx
3. Створити ThemeSettings.tsx
4. Створити InstallThemeDialog.tsx

### Етап 4: Core хуки для тем
1. Створити хуки для отримання даних (useProducts, useSections) які використовуються темами
2. Експортувати типізовані props для компонентів

---

## Взаємодія Theme і Plugins

### Plugin Slots у темах

Теми повинні підтримувати PluginSlot:

```text
// У компоненті ProductPage теми
<PluginSlot name="product.detail.before" context={{ product }} />
<ProductInfo product={product} />
<PluginSlot name="product.detail.after" context={{ product }} />
```

Тема визначає де розміщувати слоти, плагіни заповнюють контент.

---

## Налаштування теми

### Динамічні CSS variables

```text
// ThemeStylesProvider
function ThemeStylesProvider({ children }) {
  const { themeSettings } = useActiveTheme();
  
  useEffect(() => {
    const root = document.documentElement;
    if (themeSettings.primaryColor) {
      const hsl = hexToHsl(themeSettings.primaryColor);
      root.style.setProperty('--primary', hsl);
    }
  }, [themeSettings]);
  
  return children;
}
```

---

## Порядок імплементації

1. **Етап 1**: Інфраструктура
   - Створити типи та інтерфейси
   - Створити таблицю themes
   - Створити ThemeRegistry та ThemeContext

2. **Етап 2**: Міграція Default теми
   - Перенести компоненти в src/themes/default/
   - Оновити App.tsx для динамічного роутингу
   - Протестувати роботу

3. **Етап 3**: Адмін-панель
   - Створити UI управління темами
   - Додати налаштування теми
   - Встановлення/видалення тем

4. **Етап 4**: Розширення
   - Документація для розробників тем
   - Приклад мінімальної теми
   - Експорт core хуків

---

## Очікувані результати

- Можливість створювати власні теми з унікальним дизайном
- Збереження всієї бізнес-логіки в core
- Легке перемикання між темами в адмін-панелі
- Підтримка кастомізації через налаштування теми
- Сумісність з системою плагінів
- Дефолтна тема як референс для розробників

---

## Технічні примітки

### Lazy Loading тем
Теми завантажуються динамічно для оптимізації початкового bundle:
```text
const theme = await import(`@/themes/${themeName}/index.ts`);
```

### Fallback
Якщо активна тема не завантажилась, використовується дефолтна:
```text
if (!activeTheme) {
  console.warn('Falling back to default theme');
  return loadTheme('default');
}
```

### Версіонування
Теми мають версії для сумісності з core API. При оновленні CMS теми можуть потребувати оновлення.
