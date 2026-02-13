# Task: Перенос content-loader-mcp в ядро (packages/simplycms/tools/)

## Контекст

В проекті існує MCP-сервер `tools/content-loader-mcp/` — інструмент для парсингу вебсайтів та завантаження контенту в БД SimplyCMS. Сервер надає 18 MCP-інструментів для управління секціями, властивостями, товарами, seed-даними та скрапінгу HTML-сторінок.

**Поточний стан:**
- Розташування: `tools/content-loader-mcp/` (ізольований npm-проект)
- Залежності: `@modelcontextprotocol/sdk`, `cheerio`, `@supabase/supabase-js`, `zod`
- Supabase client: власний `client.ts` з `createClient()` напряму
- Типізація: нетипізований Supabase client (без `@simplycms/db-types`)
- tsconfig: власний, не пов'язаний з кореневим
- Вже виключено з Next.js build pipeline (додано `"tools"` в `exclude` кореневого `tsconfig.json`)

**Цільовий стан:** `packages/simplycms/tools/content-loader/` — частина ядра Core з правильною типізацією через `@simplycms/db-types` та використанням Supabase client factories з `@simplycms/core`.

## Вимоги

### Перенос файлів
- [ ] Перемістити `tools/content-loader-mcp/src/` → `packages/simplycms/tools/content-loader/src/`
- [ ] Перемістити `tools/content-loader-mcp/package.json` → `packages/simplycms/tools/content-loader/package.json` (оновити name/paths)
- [ ] Створити новий `tsconfig.json` для пакету з правильними paths
- [ ] Видалити `tools/content-loader-mcp/` після переносу

### Інтеграція з типами ядра
- [ ] Замінити нетипізований Supabase client на типізований через `@simplycms/db-types`:
  ```typescript
  // Було (client.ts):
  import { createClient } from "@supabase/supabase-js";
  export const supabase = createClient(url, key, opts);

  // Має стати:
  import { createClient } from "@supabase/supabase-js";
  import type { Database } from "@simplycms/db-types";
  export const supabase = createClient<Database>(url, key, opts);
  ```
- [ ] Усі Supabase-запити мають працювати з типізацією Database (автокомпліт полів таблиць, перевірка типів insert/select)
- [ ] Service role client залишається — це dev-інструмент що обходить RLS

### Ізоляція від Next.js build
- [ ] Пакет НЕ додавати в `transpilePackages` у `next.config.ts`
- [ ] Пакет НЕ додавати як alias в кореневий `tsconfig.json` paths
- [ ] Додати `packages/simplycms/tools` в `exclude` кореневого `tsconfig.json` (замість `tools`)
- [ ] Пакет має компілюватись окремо через власний `tsconfig.json`
- [ ] MCP-специфічні залежності (`@modelcontextprotocol/sdk`, `cheerio`) залишаються тільки в `package.json` пакету

### Workspace інтеграція
- [ ] Додати `packages/simplycms/tools/*` (або `packages/simplycms/tools/content-loader`) в `pnpm-workspace.yaml`
- [ ] Пакет має мати доступ до `@simplycms/db-types` через workspace resolution
- [ ] Для типізації використовувати один з підходів:
  - A) tsconfig paths в пакеті: `"@simplycms/db-types": ["../../../../supabase/types.ts"]`
  - B) Workspace dependency: `"@simplycms/db-types": "workspace:*"` (якщо є окремий пакет)
  - Рекомендовано: підхід A (як у core пакеті)

### Оновлення MCP конфігурації
- [ ] Оновити `.vscode/mcp.json` — змінити шлях:
  ```jsonc
  {
    "content-loader": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "tsx",
        "--env-file=.env.local",
        "packages/simplycms/tools/content-loader/src/index.ts"
      ]
    }
  }
  ```

### Оновлення tsconfig exclude
- [ ] В кореневому `tsconfig.json` замінити `"tools"` на `"packages/simplycms/tools"` в `exclude`:
  ```jsonc
  "exclude": [
    "node_modules",
    "temp",
    "packages/simplycms/tools",
    "supabase/functions"
  ]
  ```

## Clarify (питання перед імплементацією)

- [ ] Чи потрібно використовувати `createServiceClient()` з `@simplycms/core` замість власного `createClient()`, або залишити власний client з типізацією `Database`?
  - Чому це важливо: Core може не мати factory для service role client (зараз є лише `createServerClient` для SSR та `getSupabaseBrowserClient` для клієнта)
  - Варіанти: A) Створити `createServiceRoleClient()` в `@simplycms/core` / B) Залишити власний client в content-loader з типізацією `Database`
  - Рекомендовано: B (менше зв'язаності, service role — виключно для dev-інструментів)

- [ ] Чи додавати пакет до Git Subtree sync?
  - Чому це важливо: `packages/simplycms/` синхронізується через Git Subtree. Якщо content-loader в цій директорії — він автоматично потрапляє в sync
  - Варіанти: A) Так, нехай синхронізується з core-репозиторієм / B) Виключити через `.gitattributes` або subtree prefix
  - Рекомендовано: A (це dev-утиліта ядра, має бути доступна всім проектам)

## Рекомендовані патерни

### Типізований Supabase client для dev-інструментів
```typescript
// packages/simplycms/tools/content-loader/src/client.ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@simplycms/db-types';

const supabaseUrl =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and '
    + 'SUPABASE_SERVICE_ROLE_KEY environment variables are required'
  );
}

/** Service role Supabase client — обходить RLS для операцій імпорту */
export const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});
```

### tsconfig.json для ізольованого пакету
```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "paths": {
      "@simplycms/db-types": ["../../../../supabase/types.ts"]
    }
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

### package.json для пакету в core
```json
{
  "name": "@simplycms/content-loader",
  "version": "1.0.0",
  "description": "MCP server for content import into SimplyCMS database",
  "type": "module",
  "private": true,
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.1",
    "@supabase/supabase-js": "^2.49.4",
    "cheerio": "^1.2.0",
    "zod": "^3.25.7"
  },
  "devDependencies": {
    "tsx": "^4.19.4",
    "typescript": "^5.9.3"
  }
}
```

## Антипатерни (уникати)

### ❌ Додавання MCP-залежностей в кореневий package.json
`@modelcontextprotocol/sdk` та `cheerio` — специфічні залежності dev-інструменту. Вони НЕ мають потрапляти в production bundle Next.js.

### ❌ Додавання в transpilePackages Next.js
Це dev-tool, а не runtime пакет. Якщо Next.js спробує транспілювати цей пакет, build впаде через відсутність MCP-залежностей на CI.

### ❌ Створення alias в кореневому tsconfig paths
Alias типу `@simplycms/content-loader` в кореневому tsconfig дозволить Next.js «побачити» пакет і спробувати включити його в compilationt.

### ❌ Нетипізований Supabase client
Після переносу в core, всі Supabase-запити мають бути типізовані через `Database` з `@simplycms/db-types`. Це дозволить виявляти помилки при зміні схеми.

### ❌ Редагування `temp/`
`temp/` — read-only референс. Не змінювати.

## Архітектурні рішення

### Розташування в проекті
```
packages/simplycms/
├── core/           @simplycms/core        # Runtime
├── admin/          @simplycms/admin       # Runtime
├── ui/             @simplycms/ui          # Runtime
├── plugin-system/  @simplycms/plugins     # Runtime
├── theme-system/   @simplycms/themes      # Runtime
├── schema/                                # Seed migrations
└── tools/                                 # Dev tools (excluded from Next.js build)
    └── content-loader/  @simplycms/content-loader  # MCP server
```

### Build pipeline
- **Next.js build:** НЕ включає `packages/simplycms/tools/`
- **TypeScript check (root):** НЕ включає (в `exclude`)
- **TypeScript check (пакет):** Окремий `tsc` із власного `tsconfig.json`
- **CI:** Можна додати окремий крок `cd packages/simplycms/tools/content-loader && pnpm tsc --noEmit` для type-check

### Env змінні
MCP-сервер отримує env через `--env-file=.env.local` (Node 22+ нативний механізм). Потрібні:
- `NEXT_PUBLIC_SUPABASE_URL` або `SUPABASE_URL` — URL Supabase проекту
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key для обходу RLS

### Scraper: cheerio (не puppeteer)
Інструмент використовує `cheerio` для парсингу HTML — lightweight підхід без headless browser. Працює лише з сайтами, що віддають повний HTML (не JS-rendered SPA). Для WooCommerce-сайтів (як svitlovtemryavi.com.ua) це оптимальний вибір.

## Інструменти MCP-сервера (18 tools)

### Sections (4)
| Tool | Опис |
|------|------|
| `list_sections` | Список секцій з фільтром по parent_id |
| `create_section` | Створити секцію (name, slug, description, meta) |
| `update_section` | Оновити секцію по ID |
| `delete_section` | Видалити секцію по ID |

### Properties (5)
| Tool | Опис |
|------|------|
| `list_properties` | Список властивостей з фільтром по section_id |
| `create_property` | Створити властивість (text/number/select/boolean/...) |
| `create_property_option` | Додати опцію до select/multiselect властивості |
| `assign_property_to_section` | Прив'язати властивість до секції (product/modification рівень) |
| `create_property_full` | Створити властивість з опціями та прив'язкою за один виклик |

### Products (8)
| Tool | Опис |
|------|------|
| `list_products` | Список товарів з пагінацією |
| `get_product` | Деталі товару (+ модифікації, ціни, властивості) |
| `create_product` | Створити товар з базовою ціною |
| `create_product_full` | Створити товар + ціни + модифікації + властивості + залишки |
| `delete_product` | Видалити товар (cascade) |
| `create_modification` | Додати модифікацію (варіант) до товару |
| `set_prices` | Встановити/оновити ціни по price_type_code |
| `set_property_value` | Встановити значення властивості товару/модифікації |

### Seed (2)
| Tool | Опис |
|------|------|
| `seed_inverters` | Завантажити 10 тестових інверторів з 6 властивостями (dry_run підтримується) |
| `seed_from_json` | Універсальний імпорт: секція + властивості + товари з JSON |

### Scraper (3)
| Tool | Опис |
|------|------|
| `scrape_url` | Парсити URL (text/html/links/images/structured) |
| `scrape_product_list` | Парсити список товарів зі сторінки каталогу |
| `scrape_product_page` | Парсити детальну сторінку товару (ціна, опис, характеристики, зображення) |

## Пов'язана документація
- `AGENTS.md` — загальна архітектура проекту
- `CLAUDE.md` — технічний стек та package aliases
- `.github/instructions/architecture-core.instructions.md` — правила ядра
- `.github/instructions/data-access.instructions.md` — правила роботи з Supabase

## Definition of Done
- [ ] `tools/content-loader-mcp/` переміщено в `packages/simplycms/tools/content-loader/`
- [ ] Supabase client типізований через `@simplycms/db-types` (`createClient<Database>`)
- [ ] `tsconfig.json` пакету — ізольований, з path до `@simplycms/db-types`
- [ ] Кореневий `tsconfig.json` exclude: `"packages/simplycms/tools"` замість `"tools"`
- [ ] `.vscode/mcp.json` оновлений з новим шляхом
- [ ] `pnpm-workspace.yaml` включає новий шлях
- [ ] MCP-сервер стартує без помилок: `npx tsx --env-file=.env.local packages/simplycms/tools/content-loader/src/index.ts`
- [ ] `pnpm typecheck` (кореневий) проходить без помилок
- [ ] `pnpm build` проходить без помилок (tools не впливає)
- [ ] Всі 18 MCP-інструментів доступні після підключення через VS Code
- [ ] Стара директорія `tools/content-loader-mcp/` видалена
