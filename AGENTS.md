# SimplyCMS

Open-source e-commerce CMS platform built with Next.js App Router, Supabase, and a modular theme/plugin architecture.

## Project Overview

SimplyCMS is an SSR-first e-commerce CMS where the core functionality is distributed via Git Subtree. Each project is a standalone store with its own theme and plugins. The platform provides an admin panel, product catalog, cart, checkout, and user profiles out of the box.

**Key Features:**
- SSR-first storefront for SEO and performance
- Modular plugin system with hook registry (25+ hook points)
- Replaceable theme system (layouts, pages, components)
- Git Subtree distribution of the core package
- Supabase-based backend (PostgreSQL + Auth + Storage)
- Full admin panel for store management

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict mode) |
| Package Manager | pnpm (workspaces) |
| Database | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| UI | Tailwind v4 + shadcn/ui |
| Forms | react-hook-form + Zod |
| Data Fetching | TanStack React Query (client components) |
| Editor | Tiptap v3 |
| Charts | Recharts |
| Testing | Vitest + Testing Library |

## Project Structure

```
simplyCMS/
├── app/                            # Next.js App Router
│   ├── (storefront)/               # SSR public pages (catalog, cart, checkout)
│   ├── (cms)/admin/                # Admin panel (client-side SPA)
│   ├── (protected)/                # Auth-protected pages (profile, orders)
│   ├── auth/                       # Login/Register + OAuth callback
│   └── api/                        # API Routes (revalidation, guest orders, health)
│
├── packages/simplycms/             # GIT SUBTREE → Core repo
│   ├── core/       @simplycms/core     # Hooks, lib, types, providers, components
│   ├── admin/      @simplycms/admin    # Admin layouts, pages, components
│   ├── ui/         @simplycms/ui       # shadcn/ui design system (50+ components)
│   ├── plugin-system/ @simplycms/plugins  # HookRegistry, PluginLoader, PluginSlot
│   ├── theme-system/  @simplycms/themes   # ThemeRegistry, ThemeContext, ThemeResolver
│   └── supabase/      # Migrations, Edge Functions, config
│
├── themes/                         # Local themes
│   └── default/                    # Default theme (layouts, pages, components, styles)
│
├── plugins/                        # Local plugins (future)
├── temp/                           # Reference SPA project (read-only, migration source)
│
├── simplycms.config.ts             # CMS configuration (theme, plugins, supabase, SEO)
├── middleware.ts                    # Auth middleware (admin guard, profile guard)
└── next.config.ts                  # Next.js config (transpilePackages, images)
```

## Packages

| Package | Alias | Purpose |
|---------|-------|---------|
| `packages/simplycms/core` | `@simplycms/core` | Business logic, hooks, types, Supabase clients, components |
| `packages/simplycms/admin` | `@simplycms/admin` | Admin panel layouts, pages, and components |
| `packages/simplycms/ui` | `@simplycms/ui` | Design system (50+ shadcn/ui components) |
| `packages/simplycms/plugin-system` | `@simplycms/plugins` | Hook registry, plugin loader, PluginSlot component |
| `packages/simplycms/theme-system` | `@simplycms/themes` | Theme registry, context, resolver |
| `packages/simplycms/supabase` | — | DB migrations, Edge Functions, Supabase config |

## Setup Commands

```powershell
# Install dependencies
pnpm install

# Development (Turbopack)
pnpm dev

# Build & Test
pnpm build
pnpm test

# Code Quality
pnpm lint

# Git Subtree (core sync)
pnpm cms:pull      # Pull core updates
pnpm cms:push      # Push core changes
pnpm cms:diff      # View core changes

# Database
pnpm db:generate-types   # Regenerate TypeScript types from Supabase
pnpm db:migrate          # Apply migrations
```

## Architecture

### Rendering Strategies

| Route Group | Strategy | Description |
|-------------|----------|-------------|
| `(storefront)/` | SSR + ISR | Public pages, SEO-optimized, revalidation |
| `(cms)/admin/` | Client-only | Admin SPA, `'use client'` throughout |
| `(protected)/` | Client-only | Auth-protected user pages |
| `auth/` | Client-only | Login/register forms |
| `api/` | Server | API routes (revalidation, guest orders) |

### Data Flow

```
Browser → middleware.ts (auth) → Server Component (SSR) → Supabase → HTML
                                       ↓ hydration
                                 Client Components (cart, filters, forms)

Admin → Client Component → Supabase (browser client) → SPA behavior
```

### Theme System
- Themes implement `ThemeModule` interface (manifest, layouts, pages, components)
- Static import in `simplycms.config.ts` (requires rebuild on theme change)
- Theme resolution: local `themes/` → npm packages → `simplycms-theme-*` prefix

### Plugin System
- Plugins implement `PluginModule` interface (manifest, register/unregister)
- 25+ hook points (admin sidebar, product forms, checkout steps, etc.)
- Loaded via `simplycms.config.ts`

### Authentication
- Supabase SSR with cookie-based sessions (`@supabase/ssr`)
- Middleware guards `/admin` (requires admin role) and `/profile` (requires auth)
- No multi-tenancy — single store per project

## Migration Context

The project is migrating from a React SPA (Vite + React Router) in `./temp/` to Next.js SSR-first architecture. The `temp/` directory serves as a **read-only reference** for component migration. See `BRD_SIMPLYCMS_NEXTJS.md` for comprehensive migration plan.

## ✅ ALWAYS

- Use Next.js App Router patterns (Server Components, Server Actions)
- Follow the package structure: `@simplycms/core`, `@simplycms/admin`, `@simplycms/ui`, etc.
- Use `@simplycms/ui` components (shadcn/ui based), not local copies
- Server Components by default; `'use client'` only when needed
- SSR for storefront pages, client-side for admin
- Cookie-based auth via `@supabase/ssr`, not localStorage tokens
- Use theme system for storefront customization
- Use plugin hook registry for extensibility
- Follow Git Subtree workflow for core changes
- TypeScript strict mode (no `any`)
- Comments and documentation in Ukrainian

## ❌ NEVER

- Don't put business logic in themes (themes are visual only)
- Don't bypass theme system for storefront pages
- `'use client'` in Server Components without need
- Hardcoded Supabase URLs (use env variables)
- Direct Supabase client usage without `@simplycms/core` wrappers
- Edit files in `temp/` (read-only reference)
- Code > 150 lines without splitting
- Auth logic outside middleware.ts and auth/ route

## Detailed Instructions

Domain-specific rules in `.github/instructions/`:

| File | Applies To | Purpose |
|------|------------|---------|
| `architecture-core` | `**/*` | Core architecture, themes, plugins |
| `coding-style` | `**/*` | Code style & documentation |
| `data-access` | `app/**`, `packages/simplycms/**` | Supabase, data fetching, caching |
| `editor` | `packages/simplycms/core/**` | Tiptap editor integration |
| `storage` | `packages/simplycms/core/**`, `app/**` | Supabase Storage patterns |
| `ui-architecture` | `app/**`, `packages/simplycms/ui/**`, `themes/**` | UI components, theme structure |
| `tooling` | `**/*` | Commands, formatting, testing |
| `optimization` | `**/*.ts,**/*.tsx` | Performance patterns |

## AI Agents

- `.github/agents/` — Agent definitions (code-review, create-task, discussion, doc-update)
- `.github/copilot-instructions.md` — GitHub Copilot MCP servers & agents registry
