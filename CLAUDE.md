# CLAUDE.md — SimplyCMS

## Quick Reference

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server (Turbopack)
pnpm build            # Production build
pnpm lint             # ESLint (next lint)
pnpm test             # Run tests (vitest run)
pnpm test:watch       # Tests in watch mode
```

## What This Project Is

SimplyCMS is an open-source e-commerce CMS built with Next.js 16 App Router and Supabase. It provides a full storefront (SSR), admin panel (client-side SPA), user profiles, cart, checkout, and order management. The core CMS packages are distributed via Git Subtree from a separate repository.

## Tech Stack

- **Framework:** Next.js 16.1.6 (App Router, Turbopack)
- **Language:** TypeScript 5.9 (strict mode)
- **Package Manager:** pnpm 10.26 (workspaces)
- **Database:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **UI:** Tailwind CSS v4 + shadcn/ui (Radix primitives)
- **Forms:** react-hook-form + Zod 4
- **Data Fetching:** TanStack React Query 5 (client components)
- **Rich Text:** Tiptap v3
- **Testing:** Vitest 4 + Testing Library

## Project Structure

```
simplyCMS/
├── app/                              # Next.js App Router
│   ├── (storefront)/                 # Public SSR pages (catalog, cart, checkout)
│   ├── (cms)/admin/                  # Admin panel (client-side, auth-guarded)
│   ├── (protected)/                  # Auth-protected user pages (profile, orders)
│   ├── auth/                         # Login/register + OAuth callback
│   ├── api/                          # API routes (health, guest-order, revalidate)
│   ├── layout.tsx                    # Root layout (Inter font, ThemeProvider, Toaster)
│   └── providers.tsx                 # Client providers (CMSProvider, ThemeProvider)
│
├── supabase/                         # Site-level database (owned by project, not core)
│   ├── config.toml                   # Supabase project config (site-specific)
│   ├── migrations/                   # SQL migrations (30+ files, core seed + site-specific)
│   ├── functions/                    # Edge Functions (get-guest-order)
│   └── types.ts                      # Auto-generated TypeScript types (pnpm db:generate-types)
│
├── packages/simplycms/               # Core CMS (Git Subtree from simplyCMS-core)
│   ├── core/src/       @simplycms/core      # Hooks, types, Supabase clients, components
│   ├── admin/src/      @simplycms/admin     # Admin layouts, pages, components (57 files)
│   ├── ui/src/          @simplycms/ui       # shadcn/ui design system (50+ components)
│   ├── plugin-system/  @simplycms/plugins   # HookRegistry, PluginLoader, PluginSlot
│   ├── theme-system/   @simplycms/themes    # ThemeRegistry, ThemeContext, ThemeResolver
│   └── schema/                              # Seed migrations (reference for new projects)
│
├── themes/default/                   # Default storefront theme (layouts, pages, components)
├── plugins/                          # Local plugins directory
├── temp/                             # Reference React SPA (read-only migration source)
├── docs/                             # Documentation and analysis files
│
├── simplycms.config.ts               # CMS config (Supabase, SEO, locale, currency)
├── middleware.ts                      # Auth middleware (admin role guard, profile guard)
├── next.config.ts                    # Next.js config (transpilePackages, remote images)
├── tailwind.config.ts                # Tailwind v4 (CSS variables, custom colors, animations)
└── pnpm-workspace.yaml               # Workspace: packages/simplycms/*, themes/*, plugins/*
```

## Package Aliases (tsconfig paths)

| Import | Path |
|--------|------|
| `@simplycms/db-types` | `supabase/types.ts` |
| `@simplycms/core` | `packages/simplycms/core/src` |
| `@simplycms/admin` | `packages/simplycms/admin/src` |
| `@simplycms/ui` | `packages/simplycms/ui/src` |
| `@simplycms/plugins` | `packages/simplycms/plugin-system/src` |
| `@simplycms/themes` | `packages/simplycms/theme-system/src` |
| `@/*` | `app/*` |
| `@themes/*` | `themes/*` |
| `@plugins/*` | `plugins/*` |

## Architecture

### Rendering Strategy

- **`(storefront)/`** — SSR + ISR. Server Components by default, SEO-optimized.
- **`(cms)/admin/`** — Client-only SPA. All components use `'use client'`.
- **`(protected)/`** — Client-only, requires authentication.
- **`auth/`** — Client-only login/register.
- **`api/`** — Server-side API routes.

### Data Flow

```
Storefront: Browser → middleware.ts (auth) → Server Component → Supabase → HTML → hydration → Client Components
Admin:      Browser → middleware.ts (admin guard) → Client Component → Supabase (browser client)
```

### Authentication

- Cookie-based sessions via `@supabase/ssr` (not localStorage tokens)
- `middleware.ts` guards `/admin` (requires `admin` role in `user_roles` table) and `/profile` (requires auth)
- Redirects unauthenticated users to `/auth`

### Theme System

- Themes implement `ThemeModule` interface (manifest + layouts + pages + components)
- Registered in `app/providers.tsx` via `ThemeRegistry.register()`
- Resolution: `themes/` directory → dynamic import
- Themes are visual only — no business logic in themes

### Plugin System

- 25+ hook points (admin sidebar, product forms, checkout steps, shipping, discounts, etc.)
- `HookRegistry` for priority-based handler execution
- `PluginSlot` React component renders plugin output at hook points
- Plugins implement `PluginModule` interface (manifest + register/unregister)

### Database

- Supabase (PostgreSQL) with 43+ tables
- Row-Level Security (RLS) enabled
- Server client: `createServerClient()` for SSR
- Browser client: `getSupabaseBrowserClient()` for client components
- UUID primary keys, `created_at`/`updated_at` timestamps on all tables
- Key tables: products, modifications, orders, discounts, shipping_zones, shipping_methods, prices, price_types, modifications_stock, sections, product_reviews, user_roles, banners
- **Database ownership:** Migrations, config, types, and edge functions live at the **site level** (`supabase/`), not in the core package. Core provides Supabase client factories typed via `@simplycms/db-types` path alias
- **Type bridge:** `@simplycms/db-types` → `supabase/types.ts` (site-generated); core's `supabase/types.ts` re-exports from this alias

## Key Conventions

### Code Style

- TypeScript strict mode; avoid `any` (ESLint rule is set to `off` but strict mode enforced in tsconfig)
- Comments and documentation in Ukrainian
- Server Components by default; add `'use client'` only when interactivity is needed
- Files should not exceed ~150 lines; split into smaller modules
- Use `@simplycms/ui` components from the design system, not local component copies
- Use `@simplycms/core` wrappers for Supabase access, not direct client usage

### ESLint Configuration

- Extends `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- `@typescript-eslint/no-unused-vars`: warn (underscore-prefixed args ignored)
- `@typescript-eslint/no-explicit-any`: off
- `react/no-unescaped-entities`: off
- `@next/next/no-img-element`: off
- Ignores: `temp/**`, `node_modules/**`, `.next/**`

### Tailwind

- CSS variables for theming via `hsl(var(--*))` pattern
- Dark mode: `class` strategy
- Custom color tokens: `brand`, `primary`, `secondary`, `destructive`, `success`, `warning`, `muted`, `accent`, `sidebar`
- Content paths: `app/**`, `packages/simplycms/**/src/**`, `themes/**`, `plugins/**`

## Environment Variables

Required (copy `.env.example` to `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_PROJECT_ID` — Supabase project ref for CLI operations
- `SUPABASE_ACCESS_TOKEN` — Personal access token for Management API (types, migrations)
- `NEXT_PUBLIC_SITE_URL` — Public site URL (production)
- `REVALIDATION_SECRET` — ISR revalidation token (optional)

## Git Subtree Workflow

Core packages in `packages/simplycms/` are synced from a separate repository:

```bash
pnpm cms:pull                  # Pull core updates from simplyCMS-core main
pnpm cms:push                  # Push core changes to simplyCMS-core main
pnpm cms:push:branch <branch>  # Push to a specific branch
pnpm cms:diff                  # View local core changes
```

## Database Commands

All DB commands use `SUPABASE_PROJECT_ID` + `SUPABASE_ACCESS_TOKEN` from `.env.local` via Management API.

```bash
pnpm db:migrate                # Apply Supabase migrations (from supabase/migrations/)
pnpm db:generate-types         # Regenerate TypeScript types to supabase/types.ts
```

After schema changes, always run `pnpm db:generate-types` to keep `supabase/types.ts` in sync. The generated types are bridged to the core package via the `@simplycms/db-types` path alias in `tsconfig.json`.

### Database Architecture

```
supabase/types.ts (site-level, auto-generated)
    ↑ mapped via tsconfig: @simplycms/db-types
packages/simplycms/core/src/supabase/types.ts (re-export stub)
    ↑ relative import: ./types
packages/simplycms/core/src/supabase/client.ts, server.ts, middleware.ts
    ↑ path import: @simplycms/core/supabase/*
All consumer code (admin, core hooks, themes, app/ pages)
```

### Core Repo Autonomous Compilation

`packages/simplycms/core/src/supabase/reference-types.ts` is a copy of generated types that allows the core repo (simplyCMS-core) to compile independently. When the site's `@simplycms/db-types` alias is unavailable (i.e., in the core repo), the core repo's own tsconfig maps the alias to this file instead.

## CI/CD

GitHub Actions workflow (`.github/workflows/workflow.yml`) runs on push/PR to `main`:
- **TypeScript job:** `pnpm install` → `pnpm build` → `pnpm lint`
- **Test job:** `pnpm install` → `pnpm test`

## Rules

### Do

- Use Next.js App Router patterns (Server Components, route groups, metadata API)
- Follow the package import structure (`@simplycms/core`, `@simplycms/admin`, `@simplycms/ui`, etc.)
- Use cookie-based auth via `@supabase/ssr`
- Use the theme system for storefront customization
- Use the plugin hook registry for extensibility
- Follow Git Subtree workflow when modifying core packages

### Do Not

- Put business logic in themes (themes are visual only)
- Use `'use client'` in Server Components without necessity
- Hardcode Supabase URLs (use env variables)
- Access Supabase directly without `@simplycms/core` wrappers
- Edit files in `temp/` (read-only reference from prior SPA architecture)
- Place auth logic outside `middleware.ts` and `auth/` routes

## Additional Documentation

- `AGENTS.md` — Universal agent instructions (detailed architecture, package descriptions)
- `.github/copilot-instructions.md` — GitHub Copilot MCP server config
- `.github/instructions/` — Domain-specific rules (architecture, coding style, data access, editor, storage, UI, tooling, optimization)
- `docs/BRD_SIMPLYCMS_NEXTJS.md` — Business Requirements Document
- `docs/CODE_REVIEW_NEXTJS_MIGRATION.md` — Migration code review
- `docs/NEXTJS_SSR_ANALYSIS.md` — SSR analysis and implementation notes
